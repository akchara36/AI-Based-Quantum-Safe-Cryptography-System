const ELEMENTS = {
    dataInput: document.getElementById('data-input'),
    passwordInput: document.getElementById('password-input'),
    generateKeyBtn: document.getElementById('generate-key-btn'),
    encryptBtn: document.getElementById('encrypt-btn'),
    decryptBtn: document.getElementById('decrypt-btn'),
    resetBtn: document.getElementById('reset-btn'),
    pipelineContainer: document.getElementById('pipeline-container'),
    outBytes: document.getElementById('out-bytes'),
    outKey: document.getElementById('out-key'),
    outIv: document.getElementById('out-iv'),
    outFinal: document.getElementById('out-final'),
    globalStatus: document.getElementById('global-status'),
    logConsole: document.getElementById('log-console')
};

const DELAY_MS = 800;

const bufferToHex = (buffer) => Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
const bufferToBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const base64ToBuffer = (base64) => Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;

function addLog(message, type = 'info') {
    const time = new Date().toISOString().substring(11, 23);
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.innerHTML = `<span class="timestamp">[${time}]</span> ${message}`;
    ELEMENTS.logConsole.appendChild(logEntry);
    ELEMENTS.logConsole.scrollTop = ELEMENTS.logConsole.scrollHeight;
}

ELEMENTS.generateKeyBtn.addEventListener('click', () => {
    const randomKey = bufferToHex(crypto.getRandomValues(new Uint8Array(16)));
    ELEMENTS.passwordInput.value = randomKey;
    addLog(`Generated random password securely: ${randomKey.substring(0,8)}...`, 'success');
});

ELEMENTS.resetBtn.addEventListener('click', () => {
    ELEMENTS.dataInput.value = '';
    ELEMENTS.passwordInput.value = '';
    ELEMENTS.outBytes.innerText = '--';
    ELEMENTS.outKey.innerText = '--';
    ELEMENTS.outIv.innerText = '--';
    ELEMENTS.outFinal.innerText = '--';
    ELEMENTS.pipelineContainer.innerHTML = '';
    setStatus('Idle', '');
    ELEMENTS.logConsole.innerHTML = '<div class="log-entry system">[System] Simulator reset.</div>';
    resetPipeline();
});

function setStatus(text, className) {
    ELEMENTS.globalStatus.innerText = text;
    ELEMENTS.globalStatus.className = `status-indicator ${className}`;
}

const ENCRYPTION_STEPS = [
    { title: "Step 1: Input plaintext", desc: "Read input plaintext array." },
    { title: "Step 2: Convert to byte array", desc: "Encode string to UTF-8." },
    { title: "Step 3: Generate key", desc: "Generate Salt for Key material." },
    { title: "Step 4: Generate IV", desc: "Generate Initialization Vector." },
    { title: "Step 5: Derive key (PBKDF2)", desc: "Derive AES key using PBKDF2-SHA256." },
    { title: "Step 6: Encrypt data", desc: "AES-GCM encryption." },
    { title: "Step 7: Generate ciphertext", desc: "Produce raw ciphertext buffer." },
    { title: "Step 8: Combine IV + ciphertext", desc: "Concatenate Salt + IV + Ciphertext." },
    { title: "Step 9: Encode Base64", desc: "Encode payload for safe transport." }
];

const DECRYPTION_STEPS = [
    { title: "Step 1: Decode Base64", desc: "Decode input to binary array." },
    { title: "Step 2: Extract IV", desc: "Retrieve Salt and Initialization Vector." },
    { title: "Step 3: Extract ciphertext", desc: "Retrieve encrypted data segment." },
    { title: "Step 4: Derive key", desc: "Re-derive AES key with PBKDF2." },
    { title: "Step 5: Decrypt", desc: "Decrypt and authenticate data." },
    { title: "Step 6: Convert to plaintext", desc: "Decode UTF-8 bytes to text." }
];

function buildPipeline(steps) {
    ELEMENTS.pipelineContainer.innerHTML = '';
    steps.forEach((step, index) => {
        const block = document.createElement('div');
        block.className = 'step-block';
        block.id = `step-${index}`;
        
        block.innerHTML = `
            <div class="step-number">${index + 1}</div>
            <div class="step-details">
                <div class="step-title">${step.title}</div>
                <div class="step-desc">${step.desc}</div>
            </div>
        `;
        ELEMENTS.pipelineContainer.appendChild(block);
        
        if (index < steps.length - 1) {
            const arrow = document.createElement('div');
            arrow.className = 'step-arrow';
            arrow.id = `arrow-${index}`;
            arrow.innerHTML = '↓';
            ELEMENTS.pipelineContainer.appendChild(arrow);
        }
    });
}

function resetPipeline() {
    document.querySelectorAll('.step-block').forEach(el => el.classList.remove('active', 'done', 'error'));
    document.querySelectorAll('.step-arrow').forEach(el => el.classList.remove('active'));
}

async function activateStep(index, isFinal = false) {
    const prevBlock = document.getElementById(`step-${index - 1}`);
    const prevArrow = document.getElementById(`arrow-${index - 1}`);
    const block = document.getElementById(`step-${index}`);
    
    if (prevBlock) {
        prevBlock.classList.remove('active');
        prevBlock.classList.add('done');
    }
    if (prevArrow) prevArrow.classList.remove('active');
    
    if (block) {
        block.classList.add('active');
        block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    // Add logic to log the step dynamically if we haven't explicitely added a log
    const stepTitle = block ? block.querySelector('.step-title').innerText : `Step ${index + 1}`;
    addLog(`=> Executing ${stepTitle}...`, "info");
    
    await new Promise(r => setTimeout(r, DELAY_MS));
    
    if (isFinal && block) {
        block.classList.remove('active');
        block.classList.add('done');
    }
}

function setErrorStep(index) {
    const block = document.getElementById(`step-${index}`);
    if (block) {
        block.classList.remove('active');
        block.classList.add('error');
    }
    setStatus('Error', 'error');
}

async function deriveKey(passwordStr, saltBuffer) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw", encoder.encode(passwordStr), { name: "PBKDF2" }, false, ["deriveBits", "deriveKey"]
    );
    return await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: saltBuffer, iterations: 100000, hash: "SHA-256" },
        keyMaterial, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
    );
}

function disableButtons(disabled) {
    ELEMENTS.encryptBtn.disabled = disabled;
    ELEMENTS.decryptBtn.disabled = disabled;
}

async function runEncryption() {
    try {
        const input = ELEMENTS.dataInput.value;
        const password = ELEMENTS.passwordInput.value;
        if (!input || !password) { addLog("Missing plaintext or password.", "error"); return; }

        buildPipeline(ENCRYPTION_STEPS);
        setStatus("Encrypting...", "running");
        disableButtons(true);

        // Step 1: Input plaintext
        await activateStep(0);
        addLog(`Read plaintext. Length: ${input.length} chars`, "crypto");

        // Step 2: Convert to byte array
        await activateStep(1);
        const encoder = new TextEncoder();
        const plainData = encoder.encode(input);
        const hexData = bufferToHex(plainData.buffer);
        ELEMENTS.outBytes.innerText = window.innerWidth > 600 && hexData.length > 50 ? hexData.substring(0, 50) + "..." : hexData;
        
        // Step 3: Generate key
        await activateStep(2);
        const salt = crypto.getRandomValues(new Uint8Array(16));
        addLog(`Generated 16-byte Salt for Key: ${bufferToHex(salt.buffer)}`, "crypto");

        // Step 4: Generate IV
        await activateStep(3);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        ELEMENTS.outIv.innerText = bufferToHex(iv.buffer);

        // Step 5: Derive key (PBKDF2)
        await activateStep(4);
        const derivedKey = await deriveKey(password, salt);
        const exportedKey = await crypto.subtle.exportKey("raw", derivedKey);
        ELEMENTS.outKey.innerText = bufferToHex(exportedKey);

        // Step 6: Encrypt data
        await activateStep(5);

        // Step 7: Generate ciphertext
        await activateStep(6);
        const cipherBuffer = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv }, derivedKey, plainData
        );

        // Step 8: Combine IV + ciphertext
        await activateStep(7);
        const payload = new Uint8Array(16 + 12 + cipherBuffer.byteLength);
        payload.set(salt, 0);
        payload.set(iv, 16);
        payload.set(new Uint8Array(cipherBuffer), 28);
        
        // Step 9: Encode Base64
        await activateStep(8, true);
        const base64Out = bufferToBase64(payload.buffer);
        ELEMENTS.outFinal.innerText = base64Out;
        
        setStatus("Encryption Complete", "success");
    } catch (err) {
        addLog(`Encryption failed: ${err.message}`, "error");
        setStatus("Failed", "error");
    } finally {
        disableButtons(false);
    }
}

async function runDecryption() {
    try {
        const inputRaw = ELEMENTS.dataInput.value.trim();
        const password = ELEMENTS.passwordInput.value;
        if (!inputRaw || !password) { addLog("Missing ciphertext or password.", "error"); return; }

        buildPipeline(DECRYPTION_STEPS);
        setStatus("Decrypting...", "running");
        disableButtons(true);

        // Step 1: Decode Base64
        await activateStep(0);
        let payloadBuffer;
        try {
            payloadBuffer = base64ToBuffer(inputRaw);
            const hexData = bufferToHex(payloadBuffer);
            ELEMENTS.outBytes.innerText = window.innerWidth > 600 && hexData.length > 50 ? hexData.substring(0, 50) + "..." : hexData;
        } catch(e) {
            setErrorStep(0); throw new Error("Invalid Base64 input.");
        }

        // Step 2: Extract IV
        await activateStep(1);
        if (payloadBuffer.byteLength < 28) {
            setErrorStep(1); throw new Error("Payload too short. Missing salt or IV.");
        }
        const payloadView = new Uint8Array(payloadBuffer);
        const salt = payloadView.slice(0, 16);
        const iv = payloadView.slice(16, 28);
        ELEMENTS.outIv.innerText = bufferToHex(iv.buffer);

        // Step 3: Extract ciphertext
        await activateStep(2);
        const ciphertext = payloadView.slice(28);

        // Step 4: Derive key
        await activateStep(3);
        const derivedKey = await deriveKey(password, salt);
        const exportedKey = await crypto.subtle.exportKey("raw", derivedKey);
        ELEMENTS.outKey.innerText = bufferToHex(exportedKey);

        // Step 5: Decrypt
        await activateStep(4);
        let plainBuffer;
        try {
            plainBuffer = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv }, derivedKey, ciphertext
            );
        } catch(e) {
            setErrorStep(4); throw new Error("Decryption failed. Incorrect password or data tampered.");
        }

        // Step 6: Convert to plaintext
        await activateStep(5, true);
        const decoder = new TextDecoder();
        const plainText = decoder.decode(plainBuffer);
        ELEMENTS.outFinal.innerText = plainText;

        setStatus("Decryption Complete", "success");
    } catch (err) {
        addLog(`Decryption error: ${err.message}`, "error");
        setStatus("Failed", "error");
    } finally {
        disableButtons(false);
    }
}

ELEMENTS.encryptBtn.addEventListener('click', runEncryption);
ELEMENTS.decryptBtn.addEventListener('click', runDecryption);

