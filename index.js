import cors from "cors"; // esconder e acessar nossas variaveis de ambiente
import * as dotenv from "dotenv"; // biblioteca para variaveis de ambiente
import express from "express";
import connectToDB from "./config/db.config.js";
import userRouter from "./routes/user.routes.js";
import uploadRoute from "./routes/upload.routes.js";
import businessRoute from "./routes/business.routes.js";
import jobRouter from "./routes/job.routes.js";

dotenv.config();

connectToDB();//conecta ao DB

const app = express();

app.use(cors()); // quando não tem parametros, aceita requisição de qualquer "url".
app.use(express.json()); // configuraçã o do servidor para aceitar e enviar .json

app.use("/user", userRouter);

//CRIAR ROTA DO BUSINESS
app.use("/business", businessRoute);

//CRIAR ROTA DO JOB
app.use("/job", jobRouter);

//ex: localhost:4000/upload/file
app.use("/upload", uploadRoute);

app.listen(process.env.PORT, () => {
   console.log(`Server up and running at port ${process.env.PORT}`);
});
