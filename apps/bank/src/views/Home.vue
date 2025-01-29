<template>
  <div class="px-4 pt-3 tab-background">
    <TabList class="mt-4"  @item-change="tabListItemChange" :model="tabMenu" :active="activeTab" />
  </div>
  <div class="grid px-1 sm:px-8" >
    <h1 v-if="activeTab === TAB_STATE.OfferAccepted" class="px-3 font-normal text-4xl md:text-6xl gap-2 flex align-items-center">Active Loans <Button v-if="session.webId" icon="pi pi-refresh" class="p-button-text p-button-rounded p-button-icon-only"
                                                                               @click="fetchDemandUris(memberOf)" /></h1>
    <h1 v-else class="px-3 font-normal text-4xl md:text-6xl gap-2 flex align-items-center">{{activeTab}} <Button v-if="session.webId" icon="pi pi-refresh" class="p-button-text p-button-rounded p-button-icon-only"
                                          @click="fetchDemandUris(memberOf)" /></h1>

    <div class="col-12 flex flex-column" style="background-color:white">
      <ProgressBar v-if="isLoading" mode="indeterminate" style="height: 2px" />
      <template v-for="(demandUri, index) in demandUris" :key="demandUri">
        <div class="w-full" v-if="index === 0"></div>
        <Suspense timeout="0">
          <!-- main content -->

          <DemandProcessor :highlight="latestDiff.includes(demandUri)" :demandUri="demandUri" :demandState="activeTab"/>

          <!-- loading state -->
          <template #fallback>
            <div>
              <DemandSkeleton></DemandSkeleton>
            </div>
          </template>
        </Suspense>
      </template>
      <NoDataFound :activeTab="activeTab" v-if="!isLoading"></NoDataFound>
    </div>
  </div>
  <a class="github-fork-ribbon right-bottom fixed" href="https://github.com/DATEV-Research/Solid-B2B-showcase"
     data-ribbon="GitHub" title="GitHub">GitHub</a>

  <Toast position="bottom-center" group="updateAvailableToast">
    <template #message="slotProps">
        <div class="flex flex-wrap">
            <div class="font-medium text-lg my-4">{{ slotProps.message.summary }}</div>
            <Button class="w-full" label="Update" severity="success" @click="onApplyUpdatedDemands()"></Button>
        </div>
    </template>
</Toast>
</template>

<style scoped>
.header {
  background: linear-gradient(90deg, #195B78 0%, #287F8F 100%);
  color: white;
  position: fixed;
  padding: 0.5rem 2.5rem 1rem 2.5rem;
  box-shadow: 0 0 10px -5px black;
  z-index: 1;

  .p-button {
    margin-left: 0.5rem;
    color: white;
    background-color: rgba(255, 255, 255, 0.05);

    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }
}
.tab:not(.active){
  background-color: #033B4A26;
}
.tab-list :deep(.tab){
  background-color:#CBD5DA;
  text-color:black;
}
.tab-list :deep(.tab_content){
  color:black;
}
.tab-background{
  background:linear-gradient(90deg, #2e399e 0%, #00c6ff 100%)
}

</style>

<script setup lang="ts">
import {getDataRegistrationContainers} from "@datev-research/mandat-shared-solid-interop";
import {getResource, LDP, parseToN3} from "@datev-research/mandat-shared-solid-requests";
import {useToast} from "primevue/usetoast";
import {useSolidProfile, useSolidSession} from "@datev-research/mandat-shared-composables";
import {computed, ref, watch} from "vue";
import DemandProcessor from "../components/DemandProcessor.vue";
import {TabItemType, TabList} from "@datev-research/mandat-shared-components";
import DemandSkeleton from "@/components/DemandSkeleton.vue";
import {TAB_STATE} from "@/enums/tabsState";
import NoDataFound from "@/components/NoDataFound.vue";
import { Store } from "n3";
import { useInterval } from "@vueuse/core";


const toast = useToast();
const { session } = useSolidSession();

const shapeTreeUri = 'https://solid.aifb.kit.edu/shapes/mandat/credit.tree#creditDemandTree';
const isLoading = ref(false);
const demandUris = ref<string[]>([]);

useInterval(5_000, { callback: () => { fetchDemandUris(memberOf.value ? memberOf.value : `${session.webId}`, true) } });
let latestPollingDemandsList: string[] = [];
const latestDiff = ref<string>("");

const { memberOf } = useSolidProfile()
const isLoggedIn = computed(() => {
  return ((session.webId && !memberOf.value) || (session.webId && memberOf.value && session.rdp) ? true : false)
});

const tabMenu = ref<TabItemType[]>([
  { id: TAB_STATE.Demands, label: 'Demands' },
  { id: TAB_STATE.OfferAccepted, label: 'Active Loans' },
  { id: TAB_STATE.Terminated, label: 'Terminated' },
]);
let activeTab = ref(TAB_STATE.Demands);

function tabListItemChange(itemId: TAB_STATE) {
  activeTab.value = itemId;
}
// refetch demandUris on login
watch(() => isLoggedIn.value, (isLoggedIn) => isLoggedIn ? fetchDemandUris(((memberOf.value) ? memberOf.value : session.webId!)) : {}, { immediate: true });

function onApplyUpdatedDemands() {
  toast.removeGroup("updateAvailableToast");
  latestDiff.value = [...latestPollingDemandsList].sort().join('').replace(new RegExp(demandUris.value.join('|'), 'g'), '');
  demandUris.value = latestPollingDemandsList;
}

// discovers all containers including demands and add their contents (demands) to demandUris
async function fetchDemandUris(webId: string, informAboutUpdate = false): Promise<void> {

  isLoading.value = true;
  await getDataRegistrationContainers(webId, shapeTreeUri, session)
      .then(containerUris => 
        Promise.all(containerUris.map(containerUri => getResource(containerUri, session)
          .catch((err) => {
            toast.add({
              severity: "error",
              summary: "Error on fetch!",
              detail: err,
              life: 5000,
            });
            isLoading.value = false;
            throw new Error(err);
          })
          .then(resp => resp.data)
          .then(txt => parseToN3(txt, containerUri))
          .then(parsedN3 => [parsedN3.store, containerUri] satisfies [Store, string])
      )))
      .then(([[store, containerUri]]) => store.getObjects(containerUri, LDP("contains"), null).map((node) => node.value))
      .then(demands => { 
        const demandsFlattened = demands.flat()
        const isEqual = [...demandUris.value].sort().join('') === [...demandsFlattened].sort().join('');
        
        if (isEqual) {
          return [];
        }

        latestPollingDemandsList = demandsFlattened;

        if (informAboutUpdate) {
          toast.removeGroup("updateAvailableToast");
          toast.add({
            severity: "info",
            summary: "New demands available. Want to load them?",
            life: 0,
            group: "updateAvailableToast",
          })
        } else {
          demandUris.value = demandsFlattened;
        }
       })
      .finally(() => isLoading.value = false);
}
</script>

