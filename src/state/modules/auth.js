export const state = {
    currentUser: sessionStorage.getItem('authUser'),
}

export const mutations = {
    SET_CURRENT_USER(state, newValue) {
        state.currentUser = newValue
        sessionStorage.setItem('authUser', newValue)
    },
}

export const getters = {
    // Whether the user is currently logged in.
    loggedIn(state) {
        return !!state.currentUser
    },
}

export const actions = {
    // This is automatically run in `src/state/store.js` when the app
    // starts, along with any other actions named `init` in other modules.
    // eslint-disable-next-line no-unused-vars
    init({ state, dispatch }) {
        dispatch('validate')
    },

    // Logs in the current user.
    // eslint-disable-next-line no-unused-vars
    logIn({ commit, dispatch }, { email, password } = {}) {
        if (state.currentUser) return dispatch('validate')

        return new Promise((resolve) => {
            commit('SET_CURRENT_USER', email)
            resolve(email)
        })
    },

    // Logs out the current user.
    logOut({ commit }) {
        commit('SET_CURRENT_USER', null)
    },

    // register the user
    // eslint-disable-next-line no-unused-vars
    register({ commit, dispatch, getters }, { email, password } = {}) {
        if (getters.loggedIn) return dispatch('validate')

        return new Promise((resolve) => {
            resolve(email)
        })
    },

    // eslint-disable-next-line no-unused-vars
    resetPassword({ commit, dispatch, getters }, { email } = {}) {
        if (getters.loggedIn) return dispatch('validate')
    },

    // Validates the current user's token and refreshes it
    // with new data from the API.
    // eslint-disable-next-line no-unused-vars
    validate({ commit, state }) {
        if (!state.currentUser) return Promise.resolve(null)
        return state.currentUser
    },
}
