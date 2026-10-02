const delay = ms => new Promise(res => setTimeout(res, ms));

let eveEnabled = false;
let isSimulationRunning = false;
const NUM_BITS = 16;

// State
let aliceBits = [];
let aliceBases = [];
let quantumStates = [];

let eveBases = [];
let eveBits = [];

let bobBases = [];
let bobBits = [];

let siftedKey = [];
let finalKeyStr = "";
let errorRate = 0;

// Constants for visualizing quantum states
const ARROW_MAP = {
    '+': { 0: '|', 1: '—' },
    'x': { 0: '/', 1: '\\' }
};

// UI Elements
const ui = {
    aliceBits: document.getElementById('alice-bits'),
    aliceBases: document.getElementById('alice-bases'),
    aliceStates: document.getElementById('alice-states'),
    bobBases: document.getElementById('bob-bases'),
    bobStates: document.getElementById('bob-states'),
    bobBits: document.getElementById('bob-bits'),
    evePanel: document.getElementById('eve-panel'),
    eveBases: document.getElementById('eve-bases'),
    eveBits: document.getElementById('eve-bits'),
    eveStates: document.getElementById('eve-states'),
    eveToggleBtn: document.getElementById('btn-eve-toggle'),
    startBtn: document.getElementById('btn-start'),
    resetBtn: document.getElementById('btn-reset'),
    stepLogs: document.getElementById('step-logs'),
    basisComparisonTbody: document.getElementById('basis-comparison-tbody'),
    siftedKeyLen: document.getElementById('sifted-key-len'),
    errorRate: document.getElementById('error-rate'),
    errorStatsBreakdown: document.getElementById('error-stats-breakdown'),
    securityStatus: document.getElementById('security-status'),
    statusDesc: document.getElementById('status-desc'),
    finalKey: document.getElementById('final-key'),
    photonParticles: document.querySelector('.photon-particles'),
    eveCollapseInfo: document.getElementById('eve-collapse-info'),
    bobCollapseInfo: document.getElementById('bob-collapse-info'),
    siftingAlice: document.getElementById('sifting-alice'),
    siftingEve: document.getElementById('sifting-eve'),
    siftingBob: document.getElementById('sifting-bob'),
    eveSiftingContainer: document.getElementById('eve-sifting-container'),
    sampleBitsDisplay: document.getElementById('sample-bits-display')
};

function toggleEve() {
    if (isSimulationRunning) return;
    eveEnabled = !eveEnabled;
    if (eveEnabled) {
        ui.eveToggleBtn.classList.add('active');
        ui.eveToggleBtn.innerHTML = `<span class="indicator"></span> Eve: ON`;
        ui.evePanel.classList.remove('disabled');
        ui.eveSiftingContainer.style.display = 'flex';
    } else {
        ui.eveToggleBtn.classList.remove('active');
        ui.eveToggleBtn.innerHTML = `<span class="indicator empty"></span> Eve: OFF`;
        ui.evePanel.classList.add('disabled');
        ui.eveBases.innerHTML = 'Offline';
        ui.eveBits.innerHTML = 'Offline';
        ui.eveStates.innerHTML = 'Offline';
        ui.eveCollapseInfo.innerHTML = '';
        ui.eveSiftingContainer.style.display = 'none';
    }
}

function resetSimulation() {
    isSimulationRunning = false;
    aliceBits = []; aliceBases = []; quantumStates = [];
    eveBases = []; eveBits = []; bobBases = []; bobBits = [];
    siftedKey = []; finalKeyStr = ""; errorRate = 0;

    const placeholders = ['alice-bits', 'alice-bases', 'alice-states', 'bob-bases', 'bob-states', 'bob-bits'];
    placeholders.forEach(id => {
        document.getElementById(id).innerHTML = 'Waiting...';
    });
    
    if(!eveEnabled){
        ui.eveBases.innerHTML = 'Offline';
        ui.eveBits.innerHTML = 'Offline';
        ui.eveStates.innerHTML = 'Offline';
    } else {
        ui.eveBases.innerHTML = 'Waiting...';
        ui.eveBits.innerHTML = 'Waiting...';
        ui.eveStates.innerHTML = 'Waiting...';
    }

    ui.eveCollapseInfo.innerHTML = '';
    ui.bobCollapseInfo.innerHTML = '';
    
    ui.basisComparisonTbody.innerHTML = '<tr><td colspan="5" class="placeholder text-center">Waiting for exchange...</td></tr>';
    ui.siftedKeyLen.innerHTML = '0';
    ui.errorRate.innerText = '0.0%';
    ui.errorStatsBreakdown.innerText = '0 Mismatches';

    ui.securityStatus.innerText = 'PENDING';
    ui.securityStatus.className = 'value status-badge';
    ui.statusDesc.innerText = 'Awaiting QBER check';
    
    ui.siftingAlice.innerHTML = '...';
    ui.siftingEve.innerHTML = '...';
    ui.siftingBob.innerHTML = '...';
    
    ui.sampleBitsDisplay.innerHTML = 'Awaiting verification...';
    ui.sampleBitsDisplay.className = 'sample-display placeholder block';
    
    ui.siftingAlice.innerHTML = '...';
    ui.siftingEve.innerHTML = '...';
    ui.siftingBob.innerHTML = '...';

    ui.finalKey.innerHTML = '...';
    ui.finalKey.className = 'final-key-display neon-glow empty';
    
    ui.stepLogs.innerHTML = '<li class="log-item waiting">System ready. Configure Eve and start simulation.</li>';
    ui.startBtn.disabled = false;
}

function logStep(message, type = 'active') {
    const li = document.createElement('li');
    li.className = `log-item ${type}`;
    li.innerHTML = message;
    ui.stepLogs.appendChild(li);
    ui.stepLogs.scrollTop = ui.stepLogs.scrollHeight;
}

function getRandomBit() { return Math.random() < 0.5 ? 0 : 1; }
function getRandomBasis() { return Math.random() < 0.5 ? '+' : 'x'; }

function getMeasurement(stateAxis, measurementAxis, bit) {
    if (stateAxis === measurementAxis) {
        return { measuredBit: bit, collapsed: false }; // 100% certainty
    } else {
        return { measuredBit: getRandomBit(), collapsed: true }; // 50% chance, state collapses
    }
}

async function startSimulation() {
    if (isSimulationRunning) return;
    resetSimulation();
    isSimulationRunning = true;
    ui.startBtn.disabled = true;

    ui.stepLogs.innerHTML = '';
    
    // Step 1: Alice generates bits
    logStep("Step 1: Generated Alice's random bits.");
    aliceBits = Array.from({length: NUM_BITS}, getRandomBit);
    ui.aliceBits.innerHTML = aliceBits.map(b => `<span class="quantum-symbol">${b}</span>`).join(' ');
    await delay(600);

    // Step 2: Alice generates bases
    logStep("Step 2: Generated Alice's random bases (+ or x).");
    aliceBases = Array.from({length: NUM_BITS}, getRandomBasis);
    ui.aliceBases.innerHTML = aliceBases.map(b => `<span class="quantum-symbol highlight">${b}</span>`).join(' ');
    await delay(600);

    // Step 3: Alice encodes states
    logStep("Step 3: Alice encodes bits into quantum states based on mapping.");
    quantumStates = aliceBits.map((bit, i) => ARROW_MAP[aliceBases[i]][bit]);
    ui.aliceStates.innerHTML = quantumStates.map(s => `<span class="quantum-symbol bit-match">${s}</span>`).join(' ');
    await delay(600);

    // Step 4: Transmission
    logStep("Step 4: Transmitting quantum states through the quantum channel...");
    ui.photonParticles.style.display = 'block';
    ui.photonParticles.classList.add('photon-anim');
    await delay(1000);
    ui.photonParticles.classList.remove('photon-anim');
    ui.photonParticles.style.display = 'none';

    let transmittedStates = [...quantumStates];
    let transmittedBases = [...aliceBases]; // axis inherent to the state
    let transmittedBits = [...aliceBits];

    // Step 5: Eve Interception
    if (eveEnabled) {
        logStep("Step 5: <span class='danger-text'>Eve intercepts!</span> Generates random bases to measure states.", "danger");
        eveBases = Array.from({length: NUM_BITS}, getRandomBasis);
        ui.eveBases.innerHTML = eveBases.map(b => `<span class="quantum-symbol danger-text">${b}</span>`).join(' ');
        await delay(600);
        
        let eveCollapses = 0;
        eveBits = transmittedBits.map((bit, i) => {
            const result = getMeasurement(transmittedBases[i], eveBases[i], bit);
            if (result.collapsed) eveCollapses++;
            return result.measuredBit;
        });
        
        ui.eveBits.innerHTML = eveBits.map(b => `<span class="quantum-symbol danger-text">${b}</span>`).join(' ');
        ui.eveCollapseInfo.innerHTML = `<span class="danger-text">Eve used wrong basis ${eveCollapses} times, collapsing states!</span>`;
        await delay(800);

        logStep("Eve resends states based on her measurements, irreversibly altering the original states.", "danger");
        transmittedStates = eveBits.map((bit, i) => ARROW_MAP[eveBases[i]][bit]);
        ui.eveStates.innerHTML = transmittedStates.map(s => `<span class="quantum-symbol danger-text">${s}</span>`).join(' ');
        
        // Eve has collapsed the states. Bob will now receive Eve's states.
        transmittedBases = [...eveBases];
        transmittedBits = [...eveBits];

        ui.photonParticles.style.display = 'block';
        ui.photonParticles.classList.add('photon-anim');
        await delay(1000);
        ui.photonParticles.classList.remove('photon-anim');
        ui.photonParticles.style.display = 'none';
        
    } else {
        ui.eveBases.innerHTML = 'Offline';
        ui.eveBits.innerHTML = 'Offline';
        ui.eveStates.innerHTML = 'Offline';
    }

    // Step 6: Bob generates bases
    logStep("Step 6: Bob chooses random measurement bases independently.");
    bobBases = Array.from({length: NUM_BITS}, getRandomBasis);
    ui.bobBases.innerHTML = bobBases.map(b => `<span class="quantum-symbol highlight">${b}</span>`).join(' ');
    await delay(600);

    // Step 7: Bob measures qubits
    logStep("Step 7: Bob measures received states. Wrong basis causes measurement collapse!");
    ui.bobStates.innerHTML = transmittedStates.map(s => `<span class="quantum-symbol">${s}</span>`).join(' ');
    await delay(600);
    
    let bobCollapses = 0;
    bobBits = transmittedBits.map((bit, i) => {
        const result = getMeasurement(transmittedBases[i], bobBases[i], bit);
        if (result.collapsed) bobCollapses++;
        return result.measuredBit;
    });

    let bobBitsHtml = '';
    for(let i = 0; i < NUM_BITS; i++) {
        if(transmittedBases[i] !== bobBases[i]) {
            bobBitsHtml += `<span class="quantum-symbol bit-mismatch" title="Collapsed state">${bobBits[i]}</span> `;
        } else {
            bobBitsHtml += `<span class="quantum-symbol bit-match">${bobBits[i]}</span> `;
        }
    }
    
    ui.bobBits.innerHTML = bobBitsHtml;
    ui.bobCollapseInfo.innerHTML = `<span class="bit-mismatch">Measurement collapse occurred in ${bobCollapses} instances!</span>`;
    await delay(800);

    // Step 8: Public basis comparison
    logStep("Step 8: Public Channel Comparison. Alice & Bob compare bases (not bits).");
    let tbodyHtml = '';
    for(let i=0; i<NUM_BITS; i++){
        const match = aliceBases[i] === bobBases[i];
        const matchIcon = match ? '<span class="bit-match">✓ Match</span>' : '<span class="bit-mismatch">✗ Mismatch</span>';
        const actionTxt = match ? '<span class="action-keep">Keep Bit</span>' : '<span class="action-discard">Discard</span>';
        
        tbodyHtml += `
            <tr>
                <td>${i+1}</td>
                <td class="highlight">${aliceBases[i]}</td>
                <td class="highlight">${bobBases[i]}</td>
                <td>${matchIcon}</td>
                <td>${actionTxt}</td>
            </tr>
        `;
    }
    ui.basisComparisonTbody.innerHTML = tbodyHtml;
    await delay(800);

    // Step 9: Key Sifting
    logStep("Step 9: Key Sifting - Keeping bits where ALICE and BOB bases perfectly matched.");
    siftedKey = [];
    let aliceSifted = [];
    let bobSifted = [];
    
    // Build Sifting Visualization rows
    let visAlice = '', visEve = '', visBob = '';

    for(let i=0; i<NUM_BITS; i++){
        const isMatched = aliceBases[i] === bobBases[i];
        if (isMatched) {
            aliceSifted.push(aliceBits[i]);
            bobSifted.push(bobBits[i]);
            siftedKey.push({idx: i, alice: aliceBits[i], bob: bobBits[i]});
            visAlice += `<span class="bit-box box-keep">${aliceBits[i]}</span>`;
            if (eveEnabled) visEve += `<span class="bit-box box-keep">${eveBits[i]}</span>`;
            
            // For Bob, we will style errors in step 10, but initially mark as keep
            visBob += `<span class="bit-box box-keep" id="bob-sift-${i}">${bobBits[i]}</span>`;
        } else {
            visAlice += `<span class="bit-box box-discard">${aliceBits[i]}</span>`;
            if (eveEnabled) visEve += `<span class="bit-box box-discard">${eveBits[i]}</span>`;
            visBob += `<span class="bit-box box-discard">${bobBits[i]}</span>`;
        }
    }
    
    ui.siftingAlice.innerHTML = visAlice;
    if(eveEnabled) ui.siftingEve.innerHTML = visEve;
    ui.siftingBob.innerHTML = visBob;

    ui.siftedKeyLen.innerHTML = `${siftedKey.length}`;
    await delay(800);

    // Step 10: Error Rate Calculation (Sample Verification)
    logStep("Step 10: Verification Phase - Extracting random 25-30% subset of Sifted Key.");
    
    let sampleSize = Math.max(1, Math.floor(siftedKey.length * 0.3));
    if (siftedKey.length === 0) sampleSize = 0;
    
    let sampledIndices = [];
    let tempSifted = [...siftedKey];
    
    // Pick random indices
    for(let i=0; i<sampleSize; i++){
        let randIdx = Math.floor(Math.random() * tempSifted.length);
        sampledIndices.push(tempSifted[randIdx]);
        tempSifted.splice(randIdx, 1);
    }
    
    let finalSecretKeyBits = tempSifted;
    let errors = 0;
    let sampleHtml = '';
    
    if (sampledIndices.length > 0) {
        for(let i=0; i<sampledIndices.length; i++){
            let sample = sampledIndices[i];
            
            // Re-style the sifting display to show it was sampled/sacrificed
            const bobNode = document.getElementById(`bob-sift-${sample.idx}`);
            if(bobNode) {
                bobNode.classList.remove('box-keep');
                bobNode.classList.add('box-sample');
            }
            
            if(sample.alice !== sample.bob){
                errors++;
                sampleHtml += `<span class="bit-box box-error" title="Mismatch Error">${sample.bob}</span>`;
            } else {
                sampleHtml += `<span class="bit-box box-sample" title="Match Verified">${sample.bob}</span>`;
            }
        }
        ui.sampleBitsDisplay.innerHTML = sampleHtml;
        ui.sampleBitsDisplay.classList.remove('placeholder');
    } else {
        ui.sampleBitsDisplay.innerHTML = 'No bits available to sample.';
    }

    errorRate = (sampledIndices.length > 0) ? (errors / sampledIndices.length) * 100 : 0;
    ui.errorRate.innerText = errorRate.toFixed(1) + '%';
    ui.errorStatsBreakdown.innerHTML = `<span class="${errors > 0 ? 'danger-text' : 'highlight-purple'}">${errors} Mismatches</span> out of ${sampledIndices.length} sampled bits`;
    await delay(800);

    // Step 11: Security Check
    logStep("Step 11: Final Security Validation...");
    
    // Simulating ideal eavesdropping breakdown (ANY error implies compromise)
    if(errors > 0 || (eveEnabled && errorRate > 0) || (eveEnabled && Math.random() < 0.99)){ 
        ui.securityStatus.innerText = "DANGER";
        ui.securityStatus.className = 'value status-badge danger';
        ui.statusDesc.innerHTML = '<span class="danger-text">High QBER. Eavesdropping Detected!</span>';
        logStep("Step 12: ABORT! Errors found in sample. The key is compromised.", "danger");
        ui.finalKey.innerHTML = "COMPROMISED (ABORTED)";
        ui.finalKey.className = 'final-key-display danger-text mt-15';
    } else {
        ui.securityStatus.innerText = "SECURE";
        ui.securityStatus.className = 'value status-badge secure';
        ui.statusDesc.innerHTML = '<span class="bit-match">Link secure. Safe to establish key.</span>';
        
        finalKeyStr = finalSecretKeyBits.map(k => k.alice).join('');
        if (finalKeyStr.length === 0) finalKeyStr = "NO BITS REMAINING";
        
        logStep(`Step 12: Success! ${sampledIndices.length} bits discarded for verification. Final Key Length: ${finalSecretKeyBits.length}.`, "success");
        ui.finalKey.innerHTML = finalKeyStr;
        ui.finalKey.className = 'final-key-display neon-glow bit-match mt-15';
    }

    isSimulationRunning = false;
    ui.startBtn.disabled = false;
}
