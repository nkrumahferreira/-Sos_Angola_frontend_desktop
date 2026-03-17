<script>
import router from "@/router";
import simplebar from "simplebar-vue";
import { layoutComputed } from "@/state/helpers";

import NavBar from "@/components/nav-bar";
import Menu from "@/components/menu.vue";
import RightBar from "@/components/right-bar";
import Footer from "@/components/footer";
localStorage.setItem('hoverd', false);

/**
 * Vertical layout
 */
export default {
  components: { NavBar, RightBar, Footer, Menu, simplebar },
  data() {
    return {
      isMenuCondensed: false,
    };
  },
  computed: {
    ...layoutComputed,
    },
  created() {
    document.body.removeAttribute("data-layout", "horizontal");
    document.body.removeAttribute("data-topbar", "dark");
    document.body.removeAttribute("data-layout-size", "boxed");
    if (!document.documentElement.getAttribute("data-sidebar")) {
      document.documentElement.setAttribute("data-sidebar", "dark");
    }
  },
  methods: {
    updateSidebarSize() {
      let sidebarSize = "";
      if (window.innerWidth < 1025) {
        sidebarSize = "sm";
      } else {
        sidebarSize = "lg";
      }
      document.documentElement.setAttribute("data-sidebar-size", sidebarSize);
    },

    initActiveMenu() {
      if (document.documentElement.getAttribute('data-sidebar-size') === 'sm-hover') {
        localStorage.setItem('hoverd', true);
        document.documentElement.setAttribute('data-sidebar-size', 'sm-hover-active');
      } else if (document.documentElement.getAttribute('data-sidebar-size') === 'sm-hover-active') {
        localStorage.setItem('hoverd', false);
        document.documentElement.setAttribute('data-sidebar-size', 'sm-hover');
      } else {
        document.documentElement.setAttribute('data-sidebar-size', 'sm-hover');
      }
    },
    toggleMenu() {

      document.body.classList.toggle("sidebar-enable");
      if (window.screen.width >= 992) {
        // eslint-disable-next-line no-unused-vars
        router.afterEach((routeTo, routeFrom) => {
          document.body.classList.remove("sidebar-enable");
          document.body.classList.remove("vertical-collpsed");
        });
        document.body.classList.toggle("vertical-collpsed");
      } else {
        // eslint-disable-next-line no-unused-vars
        router.afterEach((routeTo, routeFrom) => {
          document.body.classList.remove("sidebar-enable");
        });
        document.body.classList.remove("vertical-collpsed");
      }
      this.isMenuCondensed = !this.isMenuCondensed;
    },
    toggleRightSidebar() {
      document.body.classList.toggle("right-bar-enabled");
    },
    hideRightSidebar() {
      document.body.classList.remove("right-bar-enabled");
    },

  },
  mounted() {
    if (localStorage.getItem('hoverd') == 'true') {
      document.documentElement.setAttribute('data-sidebar-size', 'sm-hover-active');
    }

    document.getElementById('overlay').addEventListener('click', () => {
      document.body.classList.remove('vertical-sidebar-enable');
    });
    if (window.screen.width < 1025) {
      document.documentElement.setAttribute("data-sidebar-size", "sm");
    }

    window.addEventListener("resize", () => {
      document.body.classList.remove('vertical-sidebar-enable');
      document.querySelector(".hamburger-icon").classList.add("open")
      this.updateSidebarSize()
    });
    
  },
  unmounted() {
    window.removeEventListener("resize", this.updateSidebarSize )
  }
};
</script>
  
<template>
  <div id="layout-wrapper">
    <NavBar />
    <div>
      <!-- ========== Left Sidebar Start ========== -->
      <!-- ========== App Menu ========== -->
      <div class="app-menu navbar-menu">
        <!-- LOGO SOS Angola -->
        <div class="navbar-brand-box">
          <!-- Logo único (usa variações de cor via tema) -->
          <router-link to="/" class="logo logo-light">
            <span class="logo-sm">
              <img src="@/assets/logo-sos.jpeg" alt="SOS Angola" height="26" class="rounded" />
            </span>
            <span class="logo-lg d-flex align-items-center">
              <img src="@/assets/logo-sos.jpeg" alt="SOS Angola" height="32" class="rounded" />
              <span class="logo-text ms-2 text-white">SOS Angola</span>
            </span>
          </router-link>
          <BButton size="sm" class="p-0 fs-20 header-item float-end btn-vertical-sm-hover"
            id="vertical-hover" @click="initActiveMenu">
            <i class="ri-record-circle-line"></i>
          </BButton>
        </div>

        <simplebar id="scrollbar" class="h-100" ref="scrollbar">
          <Menu></Menu>
        </simplebar>
        <div class="sidebar-background"></div>
      </div>
      <!-- Left Sidebar End -->
      <!-- Vertical Overlay-->
      <div class="vertical-overlay" id="overlay"></div>
    </div>
    <!-- ============================================================== -->
    <!-- Start Page Content here -->
    <!-- ============================================================== -->

    <div class="main-content">
      <div class="page-content">
        <!-- Start Content-->
        <BContainer fluid>
          <slot />
        </BContainer>
      </div>
      <Footer />
    </div>
    <RightBar />
  </div>
</template>

<style scoped>
.navbar-brand-box .logo-lg {
  justify-content: center;
}
.logo-dark .logo-text {
  color: var(--vz-body-color, #212529);
  font-weight: 600;
}
.logo-light .logo-text {
  font-weight: 600;
}
</style>
<!-- Quando a barra lateral está reduzida: esconder texto "SOS Angola" e o logo duplicado no topbar -->
<style>
[data-layout="vertical"] .app-menu .navbar-brand-box .logo-sm {
  /* Na barra lateral usamos apenas um logo (o maior) para evitar duplicação */
  display: none !important;
}
[data-sidebar-size="sm"] .app-menu .navbar-brand-box .logo-text,
[data-sidebar-size="sm-hover"] .app-menu .navbar-brand-box .logo-text {
  display: none !important;
}
[data-sidebar-size="sm"] .app-menu .navbar-brand-box .logo-lg .logo-text,
[data-sidebar-size="sm-hover"] .app-menu .navbar-brand-box .logo-lg .logo-text {
  display: none !important;
}
[data-layout="vertical"]:is([data-sidebar-size="sm"], [data-sidebar-size="sm-hover"]) #page-topbar .navbar-brand-box.horizontal-logo {
  display: none !important;
}
</style>