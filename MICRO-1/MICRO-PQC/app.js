/**
 * PQC Simulator Logic
 * Simulates CRYSTALS-Kyber (Encryption) and CRYSTALS-Dilithium (Signatures)
 * using structured random matrices/vectors for conceptual representation.
 */

// ==========================================
// Simulation Helpers & Math
// ==========================================

// Helper to generate a random hex string representation of a vector
function generateRandomVector(length) {
    return Array.from({ length }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(' ');
}

// Pseudo-hash function for deterministic simulated signatures
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0; 
    }
    return Math.abs(hash).toString(16).padEnd(8, '0');
}

// Simple XOR encryption to simulate symmetric encryption using the derived shared secret
function xorEncryptDecrypt(text, keyHex) {
    const keyStr = keyHex.replace(/ /g, ''); // flat key
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        const keyChar = keyStr.charCodeAt(i % keyStr.length) || 1;
        result += String.fromCharCode(charCode ^ keyChar);
    }
    return btoa(result); // Return as base64 for display
}

function xorDecrypt(base64Text, keyHex) {
    try {
        const text = atob(base64Text);
        const keyStr = keyHex.replace(/ /g, '');
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            const keyChar = keyStr.charCodeAt(i % keyStr.length) || 1;
            result += String.fromCharCode(charCode ^ keyChar);
        }
        return result;
    } catch(e) {
        return "DECRYPTION_ERROR";
    }
}

// ==========================================
// Cryptography Simulation Flow
// ==========================================

let systemState = {
    senderKeys: null,    // Dilithium
    receiverKeys: null,  // Kyber
    
    // Sender prepared data
    encapsulationPath: null, // Used to transport the secret
    sharedSecret: null,
    ciphertext: null,
    signature: null,
    
    // Transmitted data
    channelData: null
};

// 1. Dilithium (Sender) Key Generation
function generateDilithiumKeys() {
    return {
        pubKey: `pk_dilithium_[${generateRandomVector(8)}]`,
        privKey: `sk_dilithium_[${generateRandomVector(16)}]`
    };
}

// 2. Kyber (Receiver) Key Generation
function generateKyberKeys() {
    return {
        pubKey: `pk_kyber_[matrix_${generateRandomVector(6)}]`,
        privKey: `sk_kyber_[vec_${generateRandomVector(12)}]`
    };
}

// 3. Kyber Encapsulation (Sender side)
function kyberEncapsulate(receiverPubKey) {
    // In actual Kyber, sender uses Receiver's Public Key to generate a ciphertext (encapsulation) 
    // and a shared secret. Receiver decapsulates it.
    
    const sharedSecret = generateRandomVector(8); // 256-bit conceptual
    // Simulate encapsulation heavily coupled with the receiver's pub key
    const derivedEncapsulation = `encap_${simpleHash(receiverPubKey + sharedSecret)}_${generateRandomVector(4)}`;

    return { sharedSecret, encapsulation: derivedEncapsulation };
}

// 4. Dilithium Signature (Sender side)
function dilithiumSign(message, privKey) {
    // Signature depends on message and private key deterministically in this simulation
    const sigHash = simpleHash(message + privKey);
    return `sig_dilithium_[${sigHash}_${generateRandomVector(4)}]`;
}

// 5. Dilithium Verify (Receiver side)
function dilithiumVerify(message, signature, pubKey, simulatedSignerPrivKey) {
    // To simulate deterministic verification without full math:
    // We check if the signature matches what the system logically produced.
    // In real life, it mathematically validates the public key against the signature.
    const expectedSigPrefix = `sig_dilithium_[${simpleHash(message + simulatedSignerPrivKey)}`;
    return signature.startsWith(expectedSigPrefix);
}

// 6. Kyber Decapsulation (Receiver side)
function kyberDecapsulate(encapsulation, privKey, originalSecretToSimulate) {
    // Real life: uses privKey and encapsulation math to recover exact shared secret.
    // Simulation: check if system passes, then yield it.
    if(encapsulation) {
         return originalSecretToSimulate; // conceptually unlocked by the privKey
    }
    return null;
}

// ==========================================
// UI Interactions
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    
    // UI Elements
    const btnGenSender = document.getElementById('btn-gen-sender-keys');
    const senderKeysDisplay = document.getElementById('sender-keys-display');
    const btnGenReceiver = document.getElementById('btn-gen-receiver-keys');
    const receiverKeysDisplay = document.getElementById('receiver-keys-display');
    
    const inputMessage = document.getElementById('secret-message');
    const btnEncryptSign = document.getElementById('btn-encrypt-sign');
    const senderOutput = document.getElementById('sender-output');
    
    const btnTransmit = document.getElementById('btn-transmit');
    const channelPayload = document.getElementById('channel-payload');
    
    const incomingDataUI = document.getElementById('receiver-incoming');
    const btnVerifyDecrypt = document.getElementById('btn-verify-decrypt');
    const receiverResults = document.getElementById('receiver-results');

    // Info Modal
    const infoModal = document.getElementById('info-modal');
    document.getElementById('btn-info').addEventListener('click', () => infoModal.classList.remove('hidden'));
    document.querySelector('.close-btn').addEventListener('click', () => infoModal.classList.add('hidden'));

    // Step 1: Gen Sender Keys (Dilithium)
    btnGenSender.addEventListener('click', () => {
        systemState.senderKeys = generateDilithiumKeys();
        senderKeysDisplay.innerHTML = `
            <div><span style="color:#f472b6">Public Key:</span> ${systemState.senderKeys.pubKey}</div>
            <div style="margin-top:8px"><span style="color:#fb7185">Private Key:</span> ${systemState.senderKeys.privKey}</div>
        `;
        checkReadiness();
    });

    // Step 2: Gen Receiver Keys (Kyber)
    btnGenReceiver.addEventListener('click', () => {
        systemState.receiverKeys = generateKyberKeys();
        receiverKeysDisplay.innerHTML = `
            <div><span style="color:#38bdf8">Public Key:</span> ${systemState.receiverKeys.pubKey}</div>
            <div style="margin-top:8px"><span style="color:#818cf8">Private Key:</span> ${systemState.receiverKeys.privKey}</div>
        `;
        checkReadiness();
    });

    // Enable message input and Encrypt button when both keys are generated
    function checkReadiness() {
        if(systemState.senderKeys && systemState.receiverKeys) {
            inputMessage.disabled = false;
            btnEncryptSign.disabled = false;
        }
    }

    inputMessage.addEventListener('input', () => {
        btnEncryptSign.disabled = inputMessage.value.trim().length === 0;
    });

    // Step 3: Encrypt & Sign
    btnEncryptSign.addEventListener('click', () => {
        const msg = inputMessage.value.trim();
        
        // Kyber KEM
        const kemRun = kyberEncapsulate(systemState.receiverKeys.pubKey);
        systemState.sharedSecret = kemRun.sharedSecret;
        systemState.encapsulationPath = kemRun.encapsulation;

        // Symmetric Encryption using derived shared secret
        systemState.ciphertext = xorEncryptDecrypt(msg, systemState.sharedSecret);

        // Dilithium Signing (Sign the payload: encapsulation + ciphertext)
        const payloadToSign = systemState.encapsulationPath + "::" + systemState.ciphertext;
        systemState.signature = dilithiumSign(payloadToSign, systemState.senderKeys.privKey);

        // Display outputs
        document.getElementById('sender-shared-secret').textContent = systemState.sharedSecret;
        document.getElementById('sender-ciphertext').textContent = `Encapsulation: ${systemState.encapsulationPath}\nPayload: ${systemState.ciphertext}`;
        document.getElementById('sender-signature').textContent = systemState.signature;
        
        senderOutput.classList.remove('hidden');
        btnTransmit.disabled = false;
    });

    // Step 4: Transmit
    btnTransmit.addEventListener('click', () => {
        systemState.channelData = {
            ciphertext: systemState.ciphertext,
            encapsulation: systemState.encapsulationPath,
            signature: systemState.signature
        };

        channelPayload.textContent = `[Encapsulation Packet]\n[Encrypted Data Block]\n[Dilithium Signature Block]`;
        channelPayload.classList.add('active');

        setTimeout(() => {
            channelPayload.classList.remove('active');
            incomingDataUI.classList.remove('hidden');
            btnVerifyDecrypt.disabled = false;
            btnTransmit.disabled = true; // prevent multi-send
        }, 1000);
    });

    // Step 5: Verify & Decrypt
    btnVerifyDecrypt.addEventListener('click', () => {
        const data = systemState.channelData;
        const payloadToVerify = data.encapsulation + "::" + data.ciphertext;
        
        // 1. Verify Signature
        const isValid = dilithiumVerify(payloadToVerify, data.signature, systemState.senderKeys.pubKey, systemState.senderKeys.privKey);
        
        const statusEl = document.getElementById('verify-status');
        if (isValid) {
            statusEl.textContent = "✓ Signature Verified (Message is Authentic)";
            statusEl.className = "verification-status success";

            // 2. Decapsulate Kyber to get shared secret
            const recoveredSecret = kyberDecapsulate(data.encapsulation, systemState.receiverKeys.privKey, systemState.sharedSecret);
            document.getElementById('receiver-shared-secret').textContent = recoveredSecret;

            // 3. Decrypt Payload
            const decryptedMsg = xorDecrypt(data.ciphertext, recoveredSecret);
            document.getElementById('decrypted-message').textContent = decryptedMsg;

        } else {
            statusEl.textContent = "✗ Signature Verification FAILED! Intrusion Detected.";
            statusEl.className = "verification-status error";
            document.getElementById('receiver-shared-secret').textContent = "--- Access Denied ---";
            document.getElementById('decrypted-message').textContent = "--- Access Denied ---";
        }

        receiverResults.classList.remove('hidden');
    });
});
