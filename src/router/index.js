import { createWebHistory, createRouter } from "vue-router";
import axios from 'axios';
import routes from './routes';
import appConfig from "../../app.config";
import store from '@/state/store';

const router = createRouter({
  history: createWebHistory(),
  routes,
  // Simulate native-like scroll behavior when navigating to a new
  // route and using back/forward buttons.
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0, left: 0 };
    }
  },
});

// API based Authentication (SOS Angola backend ou themesbrand)
// Antes de cada rota protegida: se existir JWT (login autoridade), aceitar; senão tentar profile themesbrand.
router.beforeEach(async (routeTo, routeFrom, next) => {
  const authRequired = routeTo.matched.some((route) => route.meta.authRequired);
  if (!authRequired) return next();

  const jwt = localStorage.getItem('jwt');
  const user = localStorage.getItem('user');

  // Token do backend SOS Angola (login autoridade): considerar autenticado
  if (jwt && user) {
    axios.defaults.headers.common['authorization'] = 'Bearer ' + jwt;
    return next();
  }

  // Fallback: API externa (themesbrand) para projetos que usem profile
  axios.defaults.headers.common['authorization'] = 'Bearer ' + jwt;
  await axios.get('https://api-node.themesbrand.website/profile').then((data) => {
    localStorage.setItem('userdata', JSON.stringify(data.data.user));
    localStorage.setItem('userid', data.data.user._id);
    localStorage.setItem('user', JSON.stringify(data.data.user));
    next();
  }).catch(() => {
    next({ name: 'login', query: { redirectFrom: routeTo.fullPath } });
  });
});

router.beforeEach((routeTo, routeFrom, next) => {
  if (process.env.VUE_APP_DEFAULT_AUTH === "firebase") {

    // Check if auth is required on this route
    // (including nested routes).
    const authRequired = routeTo.matched.some((route) => route.meta.authRequired);

    // If auth isn't required for the route, just continue.
    if (!authRequired) return next();

    // If auth is required and the user is logged in...
    if (store.getters['auth/loggedIn']) {
      // Validate the local user token...
      return store.dispatch('auth/validate').then((validUser) => {
        // Then continue if the token still represents a valid user,
        // otherwise redirect to login.
        validUser ? next() : redirectToLogin();
      });
    }

    // If auth is required and the user is NOT currently logged in,
    // redirect to login.
    redirectToLogin();

    // eslint-disable-next-line no-unused-vars
    // eslint-disable-next-line no-inner-declarations
    function redirectToLogin() {
      // Pass the original route to the login component
      next({ name: 'login', query: { redirectFrom: routeTo.fullPath } });
    }
  } else {
    const publicPages = ['/login', '/register', '/forgot-password'];
    const authpage = !publicPages.includes(routeTo.path);
    const loggeduser = localStorage.getItem('user');

    if (authpage && !loggeduser) {
      return next('/login');
    }

    next();
  }
});

router.beforeResolve(async (routeTo, routeFrom, next) => {
  // Create a `beforeResolve` hook, which fires whenever
  // `beforeRouteEnter` and `beforeRouteUpdate` would. This
  // allows us to ensure data is fetched even when params change,
  // but the resolved route does not. We put it in `meta` to
  // indicate that it's a hook we created, rather than part of
  // Vue Router (yet?).
  try {
    // For each matched route...
    for (const route of routeTo.matched) {
      await new Promise((resolve, reject) => {
        // If a `beforeResolve` hook is defined, call it with
        // the same arguments as the `beforeEnter` hook.
        if (route.meta && route.meta.beforeResolve) {
          route.meta.beforeResolve(routeTo, routeFrom, (...args) => {
            // If the user chose to redirect...
            if (args.length) {
              // If redirecting to the same route we're coming from...
              // Complete the redirect.
              next(...args);
              reject(new Error('Redirected'));
            } else {
              resolve();
            }
          });
        } else {
          // Otherwise, continue resolving the route.
          resolve();
        }
      });
    }
    // If a `beforeResolve` hook chose to redirect, just return.
  } catch (error) {
    // Redirect was triggered via next(...args); no need to call next() again
    return;
  }
  if (routeTo.meta && routeTo.meta.title && appConfig && appConfig.title) {
    document.title = routeTo.meta.title + ' | ' + appConfig.title;
  }
  next();
});

export default router;
