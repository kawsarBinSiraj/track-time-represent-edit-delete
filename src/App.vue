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
                        start_time: "2024-10-05T22:20:20.638366+06:00",
                        end_time: "2024-10-06T02:20:20.638366+06:00",
                    },
                    data: [
                        {
                            id: 2,
                            start_time: "2024-12-05T23:30:00.638366+06:00",
                            end_time: "2024-12-05T23:45:00.638366+06:00",
                            type: "BREAK",
                        },
                    ],
                },
            ],
        };
    },
    methods: {
        handleSave(data) {
            this.result = data;
        },
        handleChange(data) {
            this.result = data;
        },
    },
};
</script>

<template>
    <div class="tracker-wrapper py-0">
        <header class="mb-5">
            <h1 class="display-5 fw-light mb-3">
                <img width="50" src="https://upload.wikimedia.org/wikipedia/commons/9/95/Vue.js_Logo_2.svg" alt="logo" class="img-fluid" />
                track time represent/edit/delete
            </h1>
            <div class="docs text-secondary ps-4 small">
                // you can insert a new entry with double click in empty slot (productive/break time) <br/>
                // for deleting the old entry you have to double with existing entry <br/>
                // for editing you can resize (left/right) on existing entry and make changes <br/>
                // for zoom(in/out) you can use plus/minus buttons <br/>
                // result will get onChange as well as onSave event
            </div>
        </header>
        <div class="individual-tracker mb-2" v-for="timeTrackers in trackersInfo" :key="timeTrackers.id">
            <time-tracker :timeTrackers="timeTrackers" :editable="true" :onSave="handleSave" :onChange="handleChange" />
        </div>
        <pre id="result" v-if="result">
            {{ JSON.stringify(result, null, 2) }}
        </pre>
    </div>
</template>

<style scope>
#app {
    max-width: 1200px;
    margin: 50px auto;
    padding: 15px;
}
</style>
