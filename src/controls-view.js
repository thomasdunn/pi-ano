export class ControlsView {

    constructor(
        scalesByLength,
        noteDurations,
        pianoNotes)
    {
        this.button = document.querySelector('button');
        this.scaleSelect = document.querySelector('#scale');
        this.bpmRange = document.querySelector('#bpm');
        this.bpmNumber = document.querySelector('#bpm-number');
        this.tonicSelect = document.querySelector('#tonic');
        this.noteDurationSelect = document.querySelector('#note-duration');
        this.loadingMessage = document.querySelector('#loading');

        this.initControls(scalesByLength, noteDurations, pianoNotes);
    }

    initControls(scalesByLength, noteDurations, pianoNotes) {
        this.bpmRange.addEventListener('input', () => {
            this.bpmNumber.value = this.bpmRange.value;
        });
        this.bpmNumber.addEventListener('input', () => {
            this.bpmRange.value = this.bpmNumber.value;
        });

        this.initScales(scalesByLength);

        this.initTonic(pianoNotes);

        this.initNoteDurations(noteDurations);
    }

    initScales(scalesByLength) {
        scalesByLength.forEach(([length, scales]) => {
            const scaleOptionGroup = document.createElement('optgroup');
            scaleOptionGroup.label = `${length} note scales`;
            scales
                .sort((s1, s2) => s1.localeCompare(s2))
                .forEach(scaleName => {
                    const scaleOption = document.createElement('option');
                    scaleOption.innerText = scaleName;
                    scaleOption.value = scaleName;
                    if (scaleName === 'major') {
                        scaleOption.selected = true;
                    }
                    scaleOptionGroup.appendChild(scaleOption);
                });

            this.scaleSelect.appendChild(scaleOptionGroup);
        });
    }

    initTonic(pianoNotes) {
        for (let i = 0; i < pianoNotes.length; i++) {
            const tonicOption = document.createElement('option');
            tonicOption.value = i;
            tonicOption.innerText = pianoNotes[i];
            if (pianoNotes[i] === 'C4') {
                tonicOption.selected = true;
            }
            this.tonicSelect.appendChild(tonicOption);
        }
    }

    initNoteDurations(noteDurations) {
        for (let i = 0; i <= 5; i++) {
            const noteDurationOption = document.createElement('option');
            noteDurationOption.value = noteDurations[i].duration;
            const text = noteDurations[i].name;
            noteDurationOption.innerText = text;
            if (text.startsWith('whole')) {
                noteDurationOption.selected = true;
            }
            this.noteDurationSelect.appendChild(noteDurationOption);
        }
    }

    getScale() {
        return this.scaleSelect.value;
    }

    getBpm() {
        return this.bpmRange.value;
    }

    getTonic() {
        return this.tonicSelect.value;
    }

    getNoteDuration() {
        return this.noteDurationSelect.value;
    }

    activateButton() {
        this.button.classList.add('active');
    }

    setButtonLabel(text) {
        this.button.textContent = text;
    }

    addButtonClickListener(listener) {
        this.button.addEventListener('click', listener);
    }

    setLoadingComplete() {
        this.loadingMessage.remove();
    }
}
