const multer = require("multer")
const { v4: uuidv4 } = require("uuid")

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => {
        const ext = file.originalname.split(".").pop()
        const filename = `${file.fieldname}-${uuidv4()}.${ext}`
        cb(null, filename)
    }
})
const fileFilter = (req, file, cb) => {
     console.log("File mimetype:", file.mimetype);
    if (file.mimetype.startsWith("image")) cb(null, true)
    else cb(new Error("only image is allowed"), false)
}
const upload = multer({
    storage, limits: { fileSize: 10*1024 * 1024 },
    fileFilter
})
module.exports = {
    single: (fieldName) => upload.single(fieldName),
    array: (fieldName, maxCount) => upload.array(fieldName, maxCount),
    fields: (fieldsArray) => upload.fields(fieldsArray),
};