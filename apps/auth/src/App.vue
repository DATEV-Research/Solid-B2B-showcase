<template>
  <AuthAppHeaderBar
    :app-logo="appLogo"
    :is-logged-in="isLoggedIn"
    :web-id="session.webId"
  />

  <main v-if="isLoggedIn && session.rdp !== ''">
    <router-view />
  </main>

  <UnauthenticatedCard v-else />

  <Toast
    position="bottom-right"
    :breakpoints="{ '420px': { width: '100%', right: '0', left: '0' } }"
  />
</template>

<script setup lang="ts">
import appLogo from "@/assets/logo.svg";
import {
  AuthAppHeaderBar,
  UnauthenticatedCard,
} from "@datev-research/mandat-shared-components";
import {
  useSolidProfile,
  useSolidSession,
} from "@datev-research/mandat-shared-composables";
import Toast from "primevue/toast";
import { computed } from "vue";
import router from "./router";

const { session, restoreSession } = useSolidSession();
const { memberOf } = useSolidProfile();
const isLoggedIn = computed(() => {
  return !!(
    (session.webId && !memberOf) ||
    (session.webId && memberOf && session.rdp)
  );
});

// re-use Solid session
router.isReady().then(() => restoreSession());
</script>

<style>
html {
  width: 100vw;
  height: 100vh;
  overscroll-behavior-y: contain;
}

body {
  overscroll-behavior-y: contain;
  margin: 0;
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  background-color: var(--surface-b);
  font-family: var(--font-family);
  font-weight: 400;
  color: var(--text-color);
}

ul,
ol {
  list-style: none;
  padding: 0;
  margin: 0;
}

#app {
  height: 100%;
  width: 100%;
}

.no-tap-highlight {
  -webkit-tap-highlight-color: transparent;
}

/* Track */
::-webkit-scrollbar-track {
  border: none;
}

/* Handle */
::-webkit-scrollbar-thumb {
  background: var(--primary-color);
}

/* Handle on hover */
::-webkit-scrollbar-thumb:hover {
  background: cadetblue;
}

/* PrimeFlex Overrides */
.grid {
  margin: 5px !important;
}

.p-button {
  -webkit-tap-highlight-color: transparent;
}
</style>
