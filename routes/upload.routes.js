import express from "express"
import uploadImg from "../config/cloudinary.config.js";

const uploadRoute = express.Router();

// multer é um middleware

uploadRoute.post("/file", uploadImg.single("picture"), (req, res) => {

    try {
        //se foi feito o upload com sucesso, a urla sera disponibilizada
        //req.file.url => url da foto upload
        if (!req.file) {
            throw new Error("Algo ocorreu de errado ao realizar o upload da imagem.")
        }

        return res.status(201).json({ url: req.file.path })
    } catch (error) {
        console.log(error);
        return res.status(500).json(error)
        
    }
})

export default uploadRoute;