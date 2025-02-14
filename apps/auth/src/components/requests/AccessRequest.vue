<template>
  <Card>
    <template #title>
      {{ $t("accessRequest.title") }}
    </template>
    <template #content>
      <div class="grid m-0">
        <div class="col-12 md:col">
          <div class="text-black-alpha-60">
            {{ $t("accessRequest.purpose") }}
          </div>
          <a v-for="label in purposes" :key="label" :href="label">
            {{ label.split("#").pop() }}
          </a>
        </div>
        <div class="col-12 md:col">
          <div class="text-black-alpha-60">
            {{ $t("accessRequest.dataRequester") }}
          </div>
          <a v-for="sender in fromSocialAgents" :key="sender" :href="sender">
            {{ senderName }}
          </a>
        </div>
        <div class="col-12 md:col">
          <div class="text-black-alpha-60">
            {{ $t("accessRequest.granted") }}
          </div>
          <a v-for="grantee in forSocialAgents" :key="grantee" :href="grantee">
            {{ granteeName }}
          </a>
        </div>
        <div v-if="seeAlso.length > 0" class="col-12 md:col">
          <div class="text-black-alpha-60">
            {{ $t("accessRequest.additionalInformation") }}
          </div>
          <a v-for="reference in seeAlso" :key="reference" :href="reference">
            {{ reference.split("/").pop() }}
          </a>
        </div>

        <Accordion class="col-12 surface-50 border-round" value="0">
          <AccordionTab>
            <template #header>
              {{ $t("accessRequest.accessNeedGroups") }}
            </template>

            <div
              v-for="accessNeedGroup in accessNeedGroups"
              :key="accessNeedGroup"
            >
              <Suspense>
                <AccessNeedGroup
                  :resourceURI="accessNeedGroup"
                  :forSocialAgents="forSocialAgents"
                  :accessAuthzContainer="accessAuthzContainer"
                  :dataAuthzContainer="dataAuthzContainer"
                  :requestAuthorizationTrigger="accessAuthorizationTrigger"
                  @createdAccessAuthorization="addToAccessAuthorizations"
                  @noDataRegistrationFound="setNoDataRegistrationFound"
                />
                <template #fallback>
                  <span>
                    {{ $t("accessRequest.loadingNeedGroup") }}
                    {{
                      accessNeedGroup.split("/")[
                        accessNeedGroup.split("/").length - 1
                      ]
                    }}
                  </span>
                </template>
              </Suspense>
            </div>
            <div v-if="noDataRegistrationFound" class="col-12 md:col">
              <div class="text-black-alpha-60">
                {{ $t("accessRequest.noDataRegistrationFound") }}:
              </div>
              <a
                v-for="shapeTree in shapeTreesOfMissingDataRegs"
                :key="shapeTree.toString()"
                :href="shapeTree.toString()"
              >
                {{ shapeTree.split("#").pop() }}
              </a>
            </div>
          </AccordionTab>
        </Accordion>
      </div>
    </template>
    <template #footer>
      <div
        class="grid sm:justify-content-end border-top-1 gap-2 pt-3 -mt-3 border-blue-100"
      >
        <Button
          class="w-full justify-content-center sm:w-auto"
          severity="primary"
          type="button"
          :disabled="
            associatedAccessReceipt !== '' ||
            accessAuthorizationTrigger ||
            noDataRegistrationFound
          "
          @click="confirmGrantWithAccessReceipt"
        >
          {{ $t("accessRequest.authorizeRequest") }}
        </Button>
        <Button
          class="w-full justify-content-center sm:w-auto"
          type="button"
          severity="secondary"
          :disabled="
            associatedAccessReceipt !== '' ||
            accessAuthorizationTrigger ||
            isPartiallyAuthorized ||
            noDataRegistrationFound
          "
          @click="confirmDeclineWithAccessReceipt"
        >
          {{ $t("accessRequest.declineRequest") }}
        </Button>
      </div>
    </template>
  </Card>

  <ConfirmDialog
    :group="'accessRequest-' + informationResourceURI"
    style="width: 40rem"
  />
</template>

<script setup lang="ts">
import AccessNeedGroup from "@/components/requests/AccessNeedGroup";
import { useSolidSession } from "@datev-research/mandat-shared-composables";
import {
  AUTH,
  createResource,
  FOAF,
  GDPRP,
  getLocationHeader,
  getResource,
  INTEROP,
  parseToN3,
  RDF,
  RDFS,
  XSD,
} from "@datev-research/mandat-shared-solid-requests";
import { Store } from "n3";
import { useToast } from "primevue/usetoast";
import { computed, reactive, ref } from "vue";
import { useConfirm } from "primevue/useconfirm";
import { useI18n } from "vue-i18n";

const props = defineProps([
  "informationResourceURI",
  "redirect",
  "dataAuthzContainer",
  "accessAuthzContainer",
  "accessReceiptContainer",
]);
const emit = defineEmits(["createdAccessReceipt"]);
const { session } = useSolidSession();
const toast = useToast();
const confirm = useConfirm();

const { t } = useI18n();

const state = reactive({
  informationResourceStore: new Store(),
  senderStore: new Store(),
  granteeStore: new Store(),
});

// get data
state.informationResourceStore = await getResource(
  props.informationResourceURI,
  session
)
  .catch((err) => {
    toast.add({
      severity: "error",
      summary: "Could not get access request!",
      detail: err,
      life: 5000,
    });
    throw new Error(err);
  })
  .then((resp) => resp.data)
  .then((txt) => parseToN3(txt, props.informationResourceURI))
  .then((parsedN3) => (state.informationResourceStore = parsedN3.store));

// compute properties to display

// // because we get the information resource URI, we need to find the Access Request URI, in theory there could be many,
// // but we only consider the first access request in an information resource. Not perfect, but makes it easier right now.
// const requests = store.value.getSubjects(RDF("type"), INTEROP("AccessRequest"), null).map(t => t.value)
const accessRequest = state.informationResourceStore
  .getSubjects(RDF("type"), INTEROP("AccessRequest"), null)
  .map((t) => t.value)[0];

const purposes = computed(() =>
  state.informationResourceStore
    .getObjects(accessRequest, GDPRP("purposeForProcessing"), null)
    .map((t) => t.value)
);
const fromSocialAgents = computed(() =>
  state.informationResourceStore
    .getObjects(accessRequest, INTEROP("fromSocialAgent"), null)
    .map((t) => t.value)
);
const forSocialAgents = computed(() => {
  const forSocialAgentsDirect = state.informationResourceStore
    .getObjects(accessRequest, INTEROP("forSocialAgent"), null)
    .map((t) => t.value);
  if (forSocialAgentsDirect.length > 0) {
    return forSocialAgentsDirect;
  }
  return fromSocialAgents.value;
});
const seeAlso = computed(() =>
  state.informationResourceStore
    .getObjects(accessRequest, RDFS("seeAlso"), null)
    .map((t) => t.value)
);
const accessNeedGroups = computed(() =>
  state.informationResourceStore
    .getObjects(accessRequest, INTEROP("hasAccessNeedGroup"), null)
    .map((t) => t.value)
);

// get access request address data

state.senderStore = await getResource(fromSocialAgents.value[0], session)
  .catch((err) => {
    toast.add({
      severity: "error",
      summary: t("accessRequest.error.sender"),
      detail: err,
      life: 5000,
    });
    throw new Error(err);
  })
  .then((resp) => resp.data)
  .then((txt) => parseToN3(txt, fromSocialAgents.value[0]))
  .then((parsedN3) => (state.senderStore = parsedN3.store));

state.granteeStore = await getResource(forSocialAgents.value[0], session)
  .catch((err) => {
    toast.add({
      severity: "error",
      summary: t("accessRequest.error.grantee"),
      detail: err,
      life: 5000,
    });
    throw new Error(err);
  })
  .then((resp) => resp.data)
  .then((txt) => parseToN3(txt, forSocialAgents.value[0]))
  .then((parsedN3) => (state.granteeStore = parsedN3.store));

const senderName = computed(
  () => state.senderStore.getObjects(null, FOAF("name"), null)[0]?.value
);
const granteeName = computed(
  () => state.granteeStore.getObjects(null, FOAF("name"), null)[0]?.value
);

// set if no matching data registrations are found for any of the child elements registeredShapeTrees
const noDataRegistrationFound = ref(false);
const shapeTreesOfMissingDataRegs = ref([] as string[]);

//
// authorize access request
//

// know which access receipt this component created
const associatedAccessReceipt = ref("");

// define a 'local name', i.e. the URI fragment, for the access receipt URI
const accessReceiptLocalName = "accessReceipt";

// keep track of which children access needs already created a access authorization
const accessAuthorizations = reactive(new Map());
// be able to trigger children to authoirze access need groups (create access authorizations and trigger their children)
const accessAuthorizationTrigger = ref(false);
// when a child access need emits their authoirzed event, add the access authorization to the map to keep record
function addToAccessAuthorizations(
  accessNeedGroup: string,
  accessAuthorization: string
) {
  accessAuthorizations.set(accessNeedGroup, accessAuthorization);
}

function setNoDataRegistrationFound(shapeTreeURI: string) {
  noDataRegistrationFound.value = true;
  shapeTreesOfMissingDataRegs.value.push(shapeTreeURI);
}

/**
 * TODO manage partial decision
 * related to denying single things
 *
 * see the commented buttons of access need and group
 *
 * <!-- DO NOT REMOVE -->
 */
const isPartiallyAuthorized = computed(() => accessAuthorizations.size > 0);

/**
 * Trigger children access need groups to create access authorization and trigger their children,
 * wait until all children have done so,
 * then create access receipt and emit finish event to parent,
 * if redirect present,
 * redirect
 */
async function grantWithAccessReceipt() {
  // trigger access grants
  accessAuthorizationTrigger.value = true;
  // wait until all events fired
  while (accessAuthorizations.size !== accessNeedGroups.value.length) {
    console.log("Waiting for access receipt ...");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  // create access receipt
  const accessReceiptLocation = createAccessReceipt([
    ...accessAuthorizations.values(),
  ]);
  // emit to overview
  associatedAccessReceipt.value =
    (await accessReceiptLocation) + "#" + accessReceiptLocalName;
  emit(
    "createdAccessReceipt",
    props.informationResourceURI,
    associatedAccessReceipt.value
  );
  // redirect if wanted
  if (props.redirect) {
    window.open(
      `${props.redirect}?uri=${encodeURIComponent(accessRequest)}&result=1`,
      "_self"
    );
  }
}

/**
 *  Create a new access receipt.
 *
 * ? This could potentially be extracted to a library.
 *
 * @param accessAuthorizations
 */
async function createAccessReceipt(accessAuthorizations: string[]) {
  const date = new Date().toISOString();
  let payload = `
    @prefix interop:<${INTEROP()}> .
    @prefix xsd:<${XSD()}> .
    @prefix auth:<${AUTH()}> .

    <#${accessReceiptLocalName}>
      a interop:AccessReceipt ;
      interop:providedAt "${date}"^^xsd:dateTime ;
      auth:hasAccessRequest <${accessRequest}>`;
  if (accessAuthorizations.length > 0) {
    payload += `
    ;
      interop:hasAccessAuthorization ${accessAuthorizations
        .map((t) => "<" + t + ">")
        .join(", ")}`;
  }
  payload += " .";
  return createResource(props.accessReceiptContainer, payload, session)
    .then((loc) => {
      toast.add({
        severity: "success",
        summary: t("accessRequest.success.accessReceiptCreated"),
        life: 5000,
      });
      return getLocationHeader(loc);
    })
    .catch((err) => {
      toast.add({
        severity: "error",
        summary: t("accessRequest.error.createAccessReceipt"),
        detail: err,
        life: 5000,
      });
      throw new Error(err);
    });
}

/**
 * Decline a request.
 * Create an access receipt that does not link to any access authorizations
 */
async function declineWithAccessReceipt() {
  // create receipt
  const accessReceiptLocation = createAccessReceipt([]);
  // emit to overview
  associatedAccessReceipt.value =
    (await accessReceiptLocation) + "#" + accessReceiptLocalName;
  emit(
    "createdAccessReceipt",
    props.informationResourceURI,
    associatedAccessReceipt.value
  );
  // redirect if wanted
  if (props.redirect) {
    window.open(
      `${props.redirect}?uri=${encodeURIComponent(accessRequest)}&result=0`,
      "_self"
    );
  }
}

function confirmGrantWithAccessReceipt(): void {
  confirm.require({
    group: `accessRequest-${props.informationResourceURI}`,
    message: t("accessRequest.confirmDialog.message"),
    header: t("accessRequest.confirmDialog.header"),
    rejectLabel: t("accessRequest.confirmDialog.cancel"),
    rejectClass: "p-button-secondary",
    acceptLabel: t("accessRequest.confirmDialog.authorize"),
    accept: () => {
      // TODO add authorizations from groups and data-authorizations
      grantWithAccessReceipt();
    },
    reject: () => {
      //
    },
  });
}

function confirmDeclineWithAccessReceipt(): void {
  confirm.require({
    group: `accessRequest-${props.informationResourceURI}`,
    message: t("accessRequest.declineDialog.message"),
    header: t("accessRequest.declineDialog.header"),
    acceptClass: "p-button-danger",
    rejectLabel: t("accessRequest.declineDialog.cancel"),
    rejectClass: "p-button-secondary",
    acceptLabel: t("accessRequest.declineDialog.decline"),
    accept: () => {
      declineWithAccessReceipt();
    },
    reject: () => {
      //
    },
  });
}
</script>

<style scoped></style>
