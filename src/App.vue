<script>
import TimeTracker from "./components/TimeTracker.vue";

export default {
    components: {
        "time-tracker": TimeTracker,
    },
    data() {
        return {
            result: null,
            trackersInfo: [
                {
                    id: 1,
                    shiftsInfo: {
                        title: "Morning Shift",
                        startH: "04",
                        startM: "10",
                        endH: "10",
                        endM: "60",
                    },
                    data: [
                        {
                            id: 6857,
                            startHours: 4,
                            startMin: 36,
                            endHours: 5,
                            endMin: 18,
                            type: "productivity",
                        },
                        {
                            id: 6948,
                            startHours: 5,
                            startMin: 24,
                            endHours: 5,
                            endMin: 51,
                            type: "break",
                        },
                        {
                            id: 7316,
                            startHours: 5,
                            startMin: 51,
                            endHours: 5,
                            endMin: 52,
                            type: "productivity",
                        },
                    ],
                },
            ],
        };
    },
    methods: {
        handleSave(data) {
            console.log(data);
            this.result = data;
        },
    },
};
</script>

<template>
    <div class="tracker-wrapper py-4">
        <h1 class="mb-5 display-5 fw-light">
            <img width="100" src="https://upload.wikimedia.org/wikipedia/commons/9/95/Vue.js_Logo_2.svg" alt="logo" class="img-fluid" />
            track time represent/edit/delete
        </h1>
        <div class="individual-tracker mb-5" v-for="timeTrackers in trackersInfo" :key="timeTrackers.id">
            <time-tracker :timeTrackers="timeTrackers" :editable="true" :onSave="handleSave" />
        </div>
        <div id="result" v-if="result">
            {{ JSON.stringify(result) }}
        </div>
    </div>
</template>
