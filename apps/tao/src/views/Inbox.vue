<script setup lang="ts">
import {useSolidSession} from "@datev-research/mandat-shared-composables";
import router from "../router";
import {toRefs} from "vue";
import {LDNs} from "@datev-research/mandat-shared-components";

const {sessionInfo} = useSolidSession();
const {isLoggedIn} = toRefs(sessionInfo);
</script>

<template>
  <div class="grid">
    <div class="col-12">
      <Button label="Zurück" icon="pi pi-arrow-left" class="p-button-text p-button-rounded" @click="router.push('/')"/>
    </div>
    <div class="col lg:col-6 lg:col-offset-3">
      <LDNs v-if="isLoggedIn"/>
    </div>
  </div>
</template>
