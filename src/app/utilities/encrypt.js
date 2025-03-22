////////////////////////////////
// 暗号化・復元化共通モジュール //
////////////////////////////////
const crypto = require("crypto");
// 暗号化用のキーとIV（初期化ベクトル）
const secretKey = process.env.NEXT_PUBLIC_SECREK_KEY;
const iv = crypto.randomBytes(16); // 16バイトのIV

// 暗号化関数
export const encrypt = (text) => {
    const cipher = crypto.createCipheriv('aes-256-cbc', secretKey, iv);
    const val = String(text);
    let encrypted = cipher.update(val, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
}
// 復号化関数
export const decrypt = (encryptedText) => {
    const parts = encryptedText.split(":");
    const iv = Buffer.from(parts.shift(), "hex");
    const encryptedData = Buffer.from(parts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(secretKey), iv);
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

// キー別暗号化
export const encryptByKey = (key, jsonObject) => {
    return encrypt(jsonObject[key]);
}
// キー別暗号化
export const encryptByKeys = (jsonObject) => {
    Object.keys(jsonObject).forEach(key => {
        jsonObject[key] = encrypt(jsonObject[key]);
    });
    return jsonObject;
}

// キー別復元化
export const decryptByKey = (key, jsonObject) => {
    return decrypt(jsonObject[key]);
}

// キー別復元化
export const decryptByKeys = (jsonObject) => {
    Object.keys(jsonObject).forEach(key => {
        jsonObject[key] = decrypt(jsonObject[key]);
    });
    return jsonObject;
}
