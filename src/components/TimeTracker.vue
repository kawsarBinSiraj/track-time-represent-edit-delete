<script>
import VueResizable from "vue-resizable";

export default {
    name: "time-tracker",
    props: {
        timeTrackers: Object,
        onSaveText: {
            type: String,
            default: "Save",
        },
        deleteAlertText: {
            type: String,
            default: "Delete",
        },
        insertAlertText: {
            type: String,
            default: "Insert",
        },
        editable: {
            type: Boolean,
            default: false,
        },
        onSave: {
            type: Function,
            required: false,
        },
        onChange: {
            type: Function,
            required: false,
        },
    },
    data() {
        return {
            MIN_PIXELS: 5,
            EACH_HOURS_WIDTH: 5 * 60,
            minW: 1 * 5, // per minutes 5 px
            maxH: 50, // Fixed height
            minH: 50, // Fixed minimum height
            top: 0,
            bottom: 0,
            width: 40,
            height: 50,
            handlers: ["r", "l"],
            fit: true,
            event: "",
            dragSelector: ".resizable-inner-block",
            totalBreakTime: 0,
            totalProductiveTime: 0,
            customData: {
                shiftInfo: {
                    startH: "04",
                    startM: "13",
                    endH: "10",
                    endM: "60",
                },
                hoursData: [],
                data: [],
            },
            modalShow: false,
            deleteItemId: null,
            debounceTimer: null,
            insertItem: {
                isTypeModalVisible: false,
                newItemStart: null,
                newItemEnd: null,
                isProductive: true,
            },
        };
    },

    components: {
        VueResizable,
    },

    watch: {
        timeTrackers(newTrackers, oldTrackers) {
            this.createdHoursData(newTrackers?.shiftInfo);
            this.modifyRootData(newTrackers?.data);
        },
    },
    mounted() {
        this.createdHoursData(this.timeTrackers?.shiftInfo);
        this.modifyRootData(this.timeTrackers?.data);
    },
    methods: {
        openDeleteModal() {
            const modalElement = this.$refs.deleteModal;
            this.deleteModalInstance = new bootstrap.Modal(modalElement);
            this.deleteModalInstance.show();
        },

        closeDeleteModal() {
            if (this.deleteModalInstance) this.deleteModalInstance.hide();
        },

        openSelectTypeModal() {
            const modalElement = this.$refs.typeModal;
            this.typeModalInstance = new bootstrap.Modal(modalElement);
            this.typeModalInstance.show();
        },

        closeSelectTypeModal() {
            if (this.typeModalInstance) this.typeModalInstance.hide();
        },

        handleSubmit() {
            if (this.onSave) {
                const data = this.generateResults(this.customData);
                this.onSave(data);
            }
        },

        handleOnChange() {
            // making total times
            const { total_break_time, total_productive_time } = this.calculateTotalTimes(this.customData.data);
            this.totalBreakTime = total_break_time;
            this.totalProductiveTime = total_productive_time;

            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                if (this.onChange) {
                    const data = this.generateResults(this.customData);
                    this.onChange(data);
                }
            }, 300); // delay to submit data around 3s
        },

        generateResults(customData) {
            const { data, shiftInfo } = customData;
            const generatedData = data.map((i, j) => {
                const { id, type, start_time, end_time } = i;
                return { id, type, start_time, end_time };
            });
            shiftInfo["total_break_time"] = this.totalBreakTime;
            shiftInfo["total_productive_time"] = this.totalProductiveTime;

            return { ...this.timeTrackers, data: generatedData, shiftInfo };
        },

        calculateTotalTimes(data) {
            let totalBreakTime = 0; // Total break time in minutes
            let totalProductiveTime = 0; // Total productive time in minutes

            data.forEach((entry) => {
                const startTime = new Date(entry.start_time);
                const endTime = new Date(entry.end_time);

                // Calculate the duration in minutes
                const durationMinutes = (endTime - startTime) / (1000 * 60); // Convert from milliseconds to minutes

                if (entry.type === "BREAK") {
                    totalBreakTime += durationMinutes;
                } else if (entry.type === "PRODUCTIVE") {
                    totalProductiveTime += durationMinutes;
                }
            });

            // Helper function to convert minutes to hours:minutes format
            function formatTime(minutes) {
                const hours = Math.floor(minutes / 60);
                const mins = Math.floor(minutes % 60);
                return `${hours}h:${mins.toString().padStart(2, "0")}m`;
            }

            return {
                total_break_time: formatTime(totalBreakTime),
                total_productive_time: formatTime(totalProductiveTime),
            };
        },

        getShiftStartMinutes() {
            const { start_time } = this.timeTrackers.shiftInfo;
            const date = new Date(start_time);
            const utcMinutes = date.getUTCMinutes();
            return utcMinutes;
        },
        getShiftEndMinutes() {
            const { end_time } = this.timeTrackers.shiftInfo;
            const date = new Date(end_time);
            const utcMinutes = date.getUTCMinutes();
            return utcMinutes;
        },

        eHandler(data, itemIndex) {
            const threshold = 0; // Threshold value to determine maximum width allowance
            // Retrieve the current item being resized
            const currentItem = this.customData.data[itemIndex];
            const { left = 0, width = 0 } = data; // Destructure left and width from resizeData
            const isLeftResizing = document.getElementsByTagName("body")[0].getAttribute("style") === "cursor: w-resize;";

            if (isLeftResizing) {
                currentItem.breakWidth = width;
                currentItem.startPosition = left >= 0 ? left : 0;

                // if it's has a previous item
                if (itemIndex > 0) {
                    const prevItem = this.customData.data[itemIndex - 1];
                    const GET_CUR_WIDTH = currentItem.endPosition - currentItem.startPosition;
                    const AT_MOST_WIDTH = currentItem.startPosition - prevItem.endPosition;
                    currentItem.maxWidth = GET_CUR_WIDTH + AT_MOST_WIDTH;
                    // Recalculate the end position based on the new width
                    currentItem.endPosition = currentItem.startPosition + currentItem.breakWidth;
                } else {
                    const THRESHOLD = Number(this.getShiftStartMinutes()) * this.MIN_PIXELS;
                    // if (left < THRESHOLD) {
                    const GET_CUR_WIDTH = currentItem.endPosition - currentItem.startPosition;
                    const AT_MOST_WIDTH = currentItem.startPosition - THRESHOLD;
                    currentItem.maxWidth = GET_CUR_WIDTH + AT_MOST_WIDTH;
                    // Recalculate the end position based on the new width
                    currentItem.endPosition = currentItem.startPosition + currentItem.breakWidth;
                }
            }
            // do stuff for write resizing
            else {
                // reset maxwidth for last item
                if (itemIndex === this.customData.data.length - 1) currentItem.maxWidth = undefined;
                // Update current item's properties based on the resize data
                currentItem.breakWidth = width; // Set the new width
                currentItem.startPosition = left; // Update the starting position
                // Calculate the end position of the current item
                currentItem.endPosition = currentItem.startPosition + currentItem.breakWidth;

                // Ensure the next item exists in the array to update its maxWidth
                if (this.customData.data.length > itemIndex + 1) {
                    const nextItemStartPosition = this.customData.data[itemIndex + 1].startPosition;
                    // Calculate the maximum allowable width for the current item based on the next item's start position
                    currentItem.maxWidth = nextItemStartPosition - currentItem.startPosition - threshold;
                }
            }

            // get current start & end hours
            const getStartTimes = this.calculateTimeFromPosition(this.customData.data[itemIndex].startPosition);
            const getEndTimes = this.calculateTimeFromPosition(this.customData.data[itemIndex].startPosition + this.customData.data[itemIndex].breakWidth);

            // Update start hours & mins
            currentItem.startHours = (getStartTimes.hours + 1) % 24; // Wrap around if necessary
            currentItem.startMin = getStartTimes.mins;

            // Update end hours & mins
            currentItem.endHours = (getEndTimes.hours + 1) % 24; // Wrap around if necessary
            currentItem.endMin = getEndTimes.mins;

            // Additional adjustment to ensure hours are in correct format
            if (currentItem.startHours === 24) currentItem.startHours = 0; // Wrap 24 to 00
            if (currentItem.endHours === 24) currentItem.endHours = 0; // Wrap 24 to 00

            // update start and end with timestamp
            this.updateTimestamp(currentItem);

            // call on change handler
            this.handleOnChange();
        },

        createStartAndEndTime(shiftInfo, adjustments) {
            const startHours = Number(adjustments.startHours);
            const startMin = Number(adjustments.startMin);
            // Parse the original start time from shiftInfo
            const originalStartDate = new Date(shiftInfo.start_time);

            // Create a new start date based on provided startHours and startMin
            const newStartDate = new Date(originalStartDate); // Clone the original date

            // Check if the new start hour is less than the original start hour
            if (startHours < originalStartDate.getUTCHours() || (startHours === originalStartDate.getUTCHours() && startMin < originalStartDate.getUTCMinutes())) {
                newStartDate.setUTCDate(newStartDate.getUTCDate() + 1); // Increment date
            }

            // Set the new start hours and minutes
            newStartDate.setUTCHours(startHours);
            newStartDate.setUTCMinutes(startMin);
            newStartDate.setUTCSeconds(0); // Set seconds to 0

            // Create end time as 5 minutes after the new start time
            const newEndDate = new Date(newStartDate);
            newEndDate.setUTCMinutes(newStartDate.getUTCMinutes() + 5); // Add 5 minutes to start time

            // Format the dates to include the UTC timezone offset (+06:00)
            const timezoneOffset = "+06:00"; // Adjust based on your requirements
            const formattedStartTime = this.formatDateWithOffset(newStartDate, timezoneOffset);
            const formattedEndTime = this.formatDateWithOffset(newEndDate, timezoneOffset);

            return {
                start_time: formattedStartTime,
                end_time: formattedEndTime,
            };
        },

        updateTimestamp(currentItem) {
            // Parse the initial start_time date to preserve its date context
            const baseStartDate = new Date(currentItem.start_time);
            // Create a new Date object for the start time
            const newStartTime = new Date(baseStartDate);
            // Set new start hours and minutes
            newStartTime.setUTCHours(Number(currentItem.startHours));
            newStartTime.setUTCMinutes(Number(currentItem.startMin));
            newStartTime.setUTCSeconds(0);
            // Adjust date only if startHours/startMin is a time earlier than the original start time
            if (
                Number(currentItem.startHours) < baseStartDate.getUTCHours() ||
                (Number(currentItem.startHours) === baseStartDate.getUTCHours() && Number(currentItem.startMin) < baseStartDate.getUTCMinutes())
            ) {
                // Increment the date only if the new start time is earlier than the original
                newStartTime.setUTCDate(newStartTime.getUTCDate() + 1);
            }

            // Create a new Date object for the end time, starting from the adjusted start time
            const newEndTime = new Date(newStartTime);
            // Set new end hours and minutes based on currentItem data
            newEndTime.setUTCHours(Number(currentItem.endHours));
            newEndTime.setUTCMinutes(Number(currentItem.endMin));
            newEndTime.setUTCSeconds(0);

            // Check if the end time is earlier than the start time (indicating it’s the next day)
            if (
                Number(currentItem.endHours) < Number(currentItem.startHours) ||
                (Number(currentItem.endHours) === Number(currentItem.startHours) && Number(currentItem.endMin) < Number(currentItem.startMin))
            ) {
                newEndTime.setUTCDate(newEndTime.getUTCDate() + 1); // Move end time to the next day
            }

            // Format the times with the timezone offset +06:00
            const timezoneOffset = "+06:00";
            currentItem.start_time = this.formatDateWithOffset(newStartTime, timezoneOffset);
            currentItem.end_time = this.formatDateWithOffset(newEndTime, timezoneOffset);
        },

        formatDateWithOffset(date, offset) {
            // Get the ISO string of the date
            const isoString = date.toISOString();
            // Replace the 'Z' (which stands for UTC) with the desired timezone offset
            return isoString.replace("Z", offset);
        },

        handleStartPosition(item) {
            return item.startPosition;
        },

        calculatePositionsAndWidth(start_time, end_time) {
            // Parse start and end times
            const startDate = new Date(start_time);
            const endDate = new Date(end_time);

            // Extract hours and minutes
            const startHours = startDate.getHours();
            const startMin = startDate.getMinutes();
            const endHours = endDate.getHours();
            const endMin = endDate.getMinutes();

            const pixelsPerHour = this.EACH_HOURS_WIDTH;
            const pixelsPerMin = this.MIN_PIXELS;
            const startHoursIdx = Number(this.customData.hoursData[0].hours);

            // Convert start time to pixel position
            const startPosition = (startHours - startHoursIdx) * pixelsPerHour + startMin * pixelsPerMin;

            let endPosition;
            // Check if the end time crosses midnight
            if (endDate.getDate() !== startDate.getDate()) {
                // Calculate pixels from start time to midnight
                const hoursUntilMidnight = 24 - startHours - 1;
                const midnightPosition = startPosition + hoursUntilMidnight * pixelsPerHour + (60 - startMin) * pixelsPerMin;
                // Add pixels for time from midnight to end time
                endPosition = midnightPosition + (endHours * pixelsPerHour + endMin * pixelsPerMin);
            } else {
                // Same-day shift
                endPosition = (endHours - startHoursIdx) * pixelsPerHour + endMin * pixelsPerMin;
            }
            // Calculate the width of the item
            const width = endPosition - startPosition;
            return { startPosition, endPosition, breakWidth: width };
        },

        calculateTimeFromPosition(pixelPosition) {
            if (!this.customData.hoursData?.length) return;
            // Base timeline start time (for example, 9:00 AM)
            const baseHours = this.customData.hoursData.length ? Number(this.customData.hoursData[0]?.hours) - 1 : 0; // Get the base start hour
            const baseMinutes = 0; // Starting minutes

            // Calculate total minutes from pixel position
            let totalMinutes = Math.floor(pixelPosition / this.MIN_PIXELS); // Convert pixel position to total minutes

            // Calculate the start hours and minutes
            let startHours = Math.floor(totalMinutes / 60); // Calculate hours
            let startMin = totalMinutes % 60; // Remaining minutes

            // Adjust if minutes equal to or greater than 60
            if (startMin >= 60) {
                startMin -= 60;
                startHours += 1; // Increment hour if minutes exceed 60
            }

            // Add base start time (timeline's start time)
            startHours += baseHours; // Add base hours
            startMin += baseMinutes; // Add base minutes

            // If minutes exceed 60 after adding base minutes, adjust the hours and minutes
            if (startMin >= 60) {
                startMin -= 60; // Subtract 60 from minutes
                startHours += 1; // Increment hour
            }
            // Ensure hours stay in 24-hour format
            startHours = (startHours + 24) % 24; // Wrap around if hours exceed 23
            // return hours and minutes
            return { hours: startHours, mins: startMin };
        },

        modifyRootData(data) {
            const TEMP_DATA = data.map((item) => {
                const start = new Date(item.start_time);
                const end = item.end_time ? new Date(item.end_time) : new Date();
                return {
                    id: item.id,
                    start_time: item.start_time,
                    end_time: item.end_time,
                    startHours: start.getHours(),
                    startMin: start.getMinutes(),
                    endHours: end.getHours(),
                    endMin: end.getMinutes(),
                    type: item.type,
                };
            });

            // store the data
            const customData = [];

            for (let i = 0; i < TEMP_DATA.length; i++) {
                const { startHours, startMin, endHours, endMin, start_time, end_time } = TEMP_DATA[i];
                // skip for startHours == endHours && startMin == endMin
                if (startHours == endHours && startMin == endMin) continue;

                customData.push({
                    maxWidth: 0,
                    ...TEMP_DATA[i],
                    ...this.calculatePositionsAndWidth(start_time, end_time),
                });
            }

            // set state customData
            this.customData.data = customData;

            // making total times
            const { total_break_time, total_productive_time } = this.calculateTotalTimes(this.customData.data);
            this.totalBreakTime = total_break_time;
            this.totalProductiveTime = total_productive_time;

            // sort the data
            this.customData.data.sort((a, b) => {
                if (a.startPosition === b.startPosition) {
                    return a.endPosition - b.endPosition; // Sort by endPosition if startPosition is the same
                }
                return a.startPosition - b.startPosition; // Sort by startPosition
            });
        },

        handleDoubleClick(event) {
            // prevent double click
            if (!this.editable) return;
            // Get the productivity container element
            const productivityContainer = this.$refs.productivityContainer;
            // Calculate the bounding rectangle of the container
            const rect = productivityContainer.getBoundingClientRect();
            // Calculate the relative X and Y positions
            const relativeX = event.clientX - rect.left; // X position relative to the left of the container
            const isResizableElement = !Boolean(event.target.closest(".resizable"));

            if (isResizableElement) {
                const intervals = [];

                for (const item of this.customData.data) {
                    intervals.push({
                        start: item.startPosition,
                        end: item.endPosition,
                    });
                }

                // if each minute pixels is greater than 5 pixels, then add minimum width is 5 minute
                const MIN_WIDTH = this.MIN_PIXELS * 1;
                // Calculate the new item's start and end positions
                let newItemStart = relativeX;
                let newItemEnd = newItemStart + MIN_WIDTH;
                // Get the container's width
                const containerWidth = productivityContainer.offsetWidth;
                // Ensure newItemEnd does not exceed the container width
                if (newItemEnd > containerWidth) {
                    // Check if there's enough space to fit at least 5 minutes
                    if (containerWidth - newItemStart < MIN_WIDTH) {
                        // Not enough space for insertion
                        return alert("There is not enough space for insertion. Minimum insertion limit is " + MIN_WIDTH / this.MIN_PIXELS + " minutes");
                    }
                    // Adjust the end and start positions to fit within the container
                    newItemEnd = containerWidth;
                    newItemStart = containerWidth - MIN_WIDTH;
                }
                // Check if the new position is insert-able
                const insertAble = this.isInsertAble(intervals, newItemStart, newItemEnd);

                if (insertAble) {
                    const minimumInsertAbleMinutes = newItemEnd + 20; // 1 + 4 minutes
                    this.insertItem = {
                        ...this.insertItem,
                        isTypeModalVisible: true,
                        newItemStart: newItemStart,
                        newItemEnd: minimumInsertAbleMinutes,
                    };
                    this.openSelectTypeModal();
                } else {
                    // invalid for insertions
                    return alert("There is not enough for insertion. Minimum insertion limit is " + (this.MIN_PIXELS * 1) / this.MIN_PIXELS + " minutes");
                }
            } else {
                // is control is true, prevent to delete
                if (event.ctrlKey) return;
                // open the modal
                this.openDeleteModal();
                const itemId = Number(event.target.closest(".resizable").getAttribute("data-id"));
                this.deleteItemId = itemId;
            }
        },

        // Function to check if the new position is insert-able
        isInsertAble(currentPositions, newStart, newEnd) {
            for (const pos of currentPositions) {
                // Check for overlap
                // Overlapping condition
                if (newStart < pos.end && newEnd > pos.start) {
                    return false; // Overlap detected, not insert-able
                }
            }

            return true; // No overlap, insert-able
        },

        handleDelete(_id) {
            let tempData = this.customData.data;
            tempData = tempData.filter((i) => i.id !== _id);
            this.customData.data = tempData;
        },

        handleScrollTo(item) {
            const container = this.$refs.timelineRef;
            const threshold = 25;

            if (container && item && typeof item.startPosition === "number") {
                // Scroll to the x-position specified by item.startPosition
                container.scrollTo({
                    top: 0, // y-axis remains 0 (no vertical scrolling)
                    left: item.startPosition - threshold, // x-axis scrolls to startPosition
                    behavior: "smooth", // Optional: Add smooth scrolling effect
                });
            } else {
                console.warn("Invalid container or item position.");
            }
        },

        handleZoom(type = "plus") {
            if (type === "plus") {
                if (this.MIN_PIXELS < 10) {
                    this.MIN_PIXELS = this.MIN_PIXELS + 1;
                    this.EACH_HOURS_WIDTH = this.MIN_PIXELS * 60;
                    // recalculate each-positions
                    this.modifyRootData(this.customData.data);
                }
            } else {
                if (this.MIN_PIXELS > 3) {
                    this.MIN_PIXELS = this.MIN_PIXELS - 1;
                    this.EACH_HOURS_WIDTH = this.MIN_PIXELS * 60;
                    // recalculate each-positions
                    this.modifyRootData(this.customData.data);
                }
            }
            // currently it will ensure 1 minute
            // re-calculate minimum-minute
            this.minW = 1 * this.MIN_PIXELS;
        },

        handleOk() {
            if (this.deleteItemId !== null) {
                this.handleDelete(this.deleteItemId);
                this.deleteItemId = null;
                this.closeDeleteModal();
                this.handleOnChange();
            }
        },

        calculateDuration(startHours, startMin, endHours, endMin) {
            // Convert start and end times to total minutes
            const startTotalMinutes = startHours * 60 + startMin;
            let endTotalMinutes = endHours * 60 + endMin;
            // Adjust end time if it is less than start time (crossing midnight)
            if (endTotalMinutes < startTotalMinutes) {
                endTotalMinutes += 24 * 60; // Add 24 hours in minutes
            }
            // Calculate the duration in minutes
            const durationInMinutes = endTotalMinutes - startTotalMinutes;
            // Convert back to hours and minutes
            const durationHours = Math.floor(durationInMinutes / 60);
            const durationMins = durationInMinutes % 60;
            return { h: durationHours, m: durationMins };
        },

        // Method to format the duration string, hiding hours if only minutes exist
        formattedDuration(item, type = "condition") {
            // const duration = this.calculateDuration(start_time, end_time);
            const duration = this.calculateDuration(item.startHours, item.startMin, item.endHours, item.endMin);

            if (!duration) return "Invalid";
            const { h = "", m = "" } = duration;
            if (type === "condition") {
                if (!h && m < 5 && this.MIN_PIXELS) {
                    return "";
                } else if (!h && m < 3) {
                    return "";
                }
            }
            return `${h}:${m}`;
        },

        // insert new item from a modal accepted
        handleTypeOkMethod() {
            const { newItemStart = null, newItemEnd = null, isProductive } = this.insertItem;

            const calculateTimeFromPosition = (pixelPosition) => {
                // Calculate total minutes from pixel position
                let totalMinutes = Math.floor(pixelPosition / this.MIN_PIXELS);

                // Calculate the start hours and minutes
                let startHours = Math.floor(totalMinutes / 60);
                let startMin = totalMinutes % 60;

                // Adjust if minutes equal to or greater than 60
                if (startMin >= 60) {
                    startMin -= 60;
                    startHours += 1;
                }

                return { hours: startHours, mins: startMin };
            };

            const getStartHours_Minutes = calculateTimeFromPosition(newItemStart);
            const getEndHours_Minutes = calculateTimeFromPosition(newItemEnd);

            const startHIdx = Number(getStartHours_Minutes.hours) >= this.customData.hoursData?.length ? this.customData.hoursData?.length - 1 : Number(getStartHours_Minutes.hours);
            const endHIdx = Number(getEndHours_Minutes.hours) >= this.customData.hoursData?.length ? this.customData.hoursData?.length - 1 : Number(getEndHours_Minutes.hours);
            const startHoursIndex = this.customData.hoursData[startHIdx];
            const endHoursIndex = this.customData.hoursData[endHIdx];

            const tempItem = {
                maxWidth: undefined,
                id: Math.floor(Math.random() * 9999),
                startHours: startHoursIndex.hours,
                startMin: getStartHours_Minutes.mins,
                endHours: endHoursIndex.hours,
                endMin: getEndHours_Minutes.mins,
                startPosition: newItemStart,
                endPosition: newItemEnd,
                breakWidth: newItemEnd - newItemStart,
                type: isProductive ? "PRODUCTIVE" : "BREAK",
            };

            const { start_time, end_time } = this.createStartAndEndTime(this.customData.shiftInfo, tempItem);
            tempItem["start_time"] = start_time;
            tempItem["end_time"] = end_time;

            // Push the new item to the existing data array
            this.customData.data.push(tempItem);

            // Sort the data array by startPosition, then by endPosition
            this.customData.data.sort((a, b) => {
                if (a.startPosition === b.startPosition) {
                    return a.endPosition - b.endPosition; // Sort by endPosition if startPosition is the same
                }
                return a.startPosition - b.startPosition; // Sort by startPosition
            });
            this.closeSelectTypeModal();
            this.handleOnChange();
        },

        createdHoursData(shift = {}) {
            //extract the start and end with timestamp
            const startTime = new Date(shift?.start_time);
            const endTime = shift?.end_time ? new Date(shift.end_time) : new Date();

            // getting hour, minutes
            const startH = startTime.getHours();
            const endH = endTime.getHours();
            const startM = startTime.getMinutes();
            const endM = endTime.getMinutes();

            const tempHeader = [];
            let start = Number(startH);
            const end = Number(endH);

            if (end < start) {
                // Add hours from start hour to 23
                for (let i = start; i < 24; i++) {
                    tempHeader.push({
                        id: i,
                        hours: i < 10 ? String("0" + i) : String(i),
                        min: "00",
                    });
                }
                // Add hours from 0 to end hour
                for (let i = 0; i <= end; i++) {
                    tempHeader.push({
                        id: i,
                        hours: i < 10 ? String("0" + i) : String(i),
                        min: "00",
                    });
                }
            } else {
                // Normal case: end hour is greater than or equal to start hour
                for (let i = start; i <= end; i++) {
                    tempHeader.push({
                        id: i,
                        hours: i < 10 ? String("0" + i) : String(i),
                        min: "00",
                    });
                }
            }

            this.customData.hoursData = tempHeader;
            this.customData.shiftInfo = this.timeTrackers.shiftInfo;
        },

        infilterMinutesForLastItem() {
            const endMinute = Number(this.customData.shiftInfo.endM); // Ending minute, e.g., 50
            const interval = 5; // Each interval is 5 minutes
            const roundedEndMinute = Math.floor(endMinute / interval) * interval; // Round down to nearest multiple of 5
            const minutesArray = [];

            // Generate an array of minutes from 0 to endM, in steps of 5
            for (let i = 0; i <= roundedEndMinute; i += interval) {
                minutesArray.push(i); // Push minute values (0, 5, 10, etc.)
            }

            return minutesArray;
        },
    },
};
</script>

<template>
    <main
        id="main"
        developed-by="kawsar bin siraj"
        :style="{
            '--each-min-pixels': this.MIN_PIXELS + 'px',
            '--hours-length': this.customData.hoursData.length,
            '--left-minus': Number(this.getShiftStartMinutes()) * this.MIN_PIXELS + 'px',
            '--subs': Number(60 - this.getShiftEndMinutes()) * this.MIN_PIXELS + 'px',
        }"
    >
        <!-- track time header  -->
        <header class="enable-zoom zoom mb-3 d-flex flex-wrap align-items-center">
            <button class="custom-btn rounded-circle me-1" type="button" @click="handleZoom('plus')">+</button>
            <button class="custom-btn rounded-circle me-3" type="button" @click="handleZoom('minus')">-</button>
            <h4 class="mb-0 fw-normal me-3">{{ this.timeTrackers?.shiftInfo?.title }}</h4>
            <div class="total-times fw-light" v-if="this.totalBreakTime && this.totalProductiveTime">
                <span class="fw-normal d-inline-flex align-items-center gap-1">
                    <span class="badge bg-productive">Productive</span>
                    <span style="width: 65px" class="fw-bold">{{ this.totalProductiveTime }}</span>
                </span>
                <span class="fw-normal d-inline-flex align-items-center gap-1 ms-2">
                    <span class="badge bg-break">Break</span>
                    <span style="width: 65px" class="fw-bold">{{ this.totalBreakTime }} </span>
                </span>
            </div>
            <button v-if="this.editable" @click="this.handleSubmit" class="ms-auto btn btn-sm btn-success bg-gradient">{{ this.onSaveText }}</button>
        </header>

        <!-- timeline-widget -->
        <div ref="timelineRef" class="timeline-widget border rounded">
            <div class="timeline-header">
                <div
                    class="hour"
                    v-for="(item, key) in customData.hoursData"
                    :key="item.id"
                    :style="{
                        '--total-minutes': key === this.customData.hoursData?.length - 1 ? Number(this.getShiftEndMinutes()) : 60,
                    }"
                >
                    <div
                        class="text-nowrap"
                        :style="{
                            'padding-left': key == 0 && Number(this.getShiftStartMinutes()) < 45 ? Number(this.getShiftStartMinutes()) * this.MIN_PIXELS + 'px' : '0px',
                        }"
                    >
                        {{ item.hours }} : {{ item.min }}
                    </div>
                    <div class="p-0 m-0 text-start d-flex minutes-widget w-full" v-if="this.MIN_PIXELS > 3">
                        <p
                            :style="{
                                width: this.MIN_PIXELS * 5 + 'px',
                            }"
                            v-for="minutes in 12"
                            :key="minutes"
                        >
                            {{ (minutes - 1) * 5 }}
                        </p>
                    </div>
                </div>
            </div>
            <div v-if="customData.data" class="productivity" @dblclick="handleDoubleClick" ref="productivityContainer">
                <vue-resizable
                    v-for="(item, index) in customData.data"
                    :key="item.id"
                    :class="{
                        resizable: true,
                        'productivity-steps': item.type === 'PRODUCTIVE',
                        'small-resizer': item.breakWidth < 25,
                    }"
                    :ref="'resizableComponent'"
                    :dragSelector="undefined"
                    :active="this.editable ? handlers : []"
                    :fit-parent="fit"
                    :max-width="item.maxWidth"
                    :max-height="maxH"
                    :min-width="minW"
                    :min-height="minH"
                    :width="item.breakWidth"
                    :height="height"
                    :left="handleStartPosition(item)"
                    :bottom="0"
                    @resize:move="
                        (data) => {
                            eHandler(data, index);
                        }
                    "
                    :data-id="item.id"
                    :title="formattedDuration(item)"
                >
                    <div class="block-widget">
                        <div class="resizable-inner-block">
                            <span class="inner-time-text"> {{ formattedDuration(item, "condition") }}</span>
                        </div>
                        <span class="left-block">{{ item.startHours + ":" + item.startMin }}</span>
                        <span class="right-block">{{ item.endHours + ":" + item.endMin }}</span>
                    </div>
                </vue-resizable>
            </div>
        </div>

        <!-- Delete Modal -->
        <div ref="deleteModal" class="deleteModal modal fade" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header border-0 p-4 pb-2 d-flex align-items-center">
                        <h1 class="modal-title d-flex align-items-center gap-2 text-uppercase fw-bold text-danger fs-5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-trash3" viewBox="0 0 16 16">
                                <path
                                    d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"
                                />
                            </svg>
                            {{ this.deleteAlertText }} !
                        </h1>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4 pt-0">
                        <h3 class="fs-4 fw-light">
                            Are <span class="text-lowercase">you sure, you want to {{ this.deleteAlertText }} this?</span>
                        </h3>
                    </div>
                    <div class="modal-footer pe-4">
                        <button type="button" class="btn btn-sm btn-secondary bg-gradient" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" @click="handleOk" class="btn btn-sm btn-danger bg-gradient">{{ this.deleteAlertText }}</button>
                    </div>
                </div>
            </div>
        </div>
        <!--/ Delete Modal -->

        <!-- Select Type Modal -->
        <div ref="typeModal" class="selectTypeModal modal fade" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header border-0 p-4 pb-3 d-flex align-items-center">
                        <h1 class="modal-title fw-light d-flex align-items-center gap-2 text-uppercase fw-bold text-primary fs-5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-info-circle" viewBox="0 0 16 16">
                                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
                                <path
                                    d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0"
                                />
                            </svg>
                            Select a type
                        </h1>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4 pt-0">
                        <div class="input-group d-flex flex-column">
                            <div class="form-check input-form-check">
                                <input class="form-check-input" type="radio" name="flexRadioDefault" id="flexRadioDefault1" @change="this.insertItem.isProductive = false" />
                                <label class="form-check-label" for="flexRadioDefault1"> Break </label>
                            </div>
                            <div class="form-check input-form-check">
                                <input
                                    class="form-check-input"
                                    type="radio"
                                    name="flexRadioDefault"
                                    id="flexRadioDefault2"
                                    @change="this.insertItem.isProductive = true"
                                    :checked="this.insertItem.isProductive"
                                />
                                <label class="form-check-label" for="flexRadioDefault2"> Productive </label>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer pe-4">
                        <button type="button" class="btn btn-sm btn-secondary bg-gradient" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" @click="handleTypeOkMethod" class="btn btn-sm btn-primary bg-gradient">{{ this.insertAlertText }}</button>
                    </div>
                </div>
            </div>
        </div>
        <!--/ Select Type Modal -->
    </main>
</template>
