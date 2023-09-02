import express from "express";
import BusinessModel from "../model/business.model.js";
import bcrypt from "bcrypt";
import generateToken from "../config/jwt.config.js";
import isAuth from "../middlewares/isAuth.js";

//instanciar o router
const businessRoute = express.Router();

const SALT_ROUNDS = 10;

businessRoute.post("/signup", async (req, res) => {
  try {
    const form = req.body;

    console.log(form);

    if (!form.email || !form.password) {
      throw new Error("Por favor, envie um email e uma senha");
    }

    if (
      form.password.match(
        /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$ %^&*-]).{8,}$/gm
      ) === false
    ) {
      // If the password does not meet the requirements, throw an error
      throw new Error(
        "A senha não preenche os requisitos básicos. 8 caracteres. Maiuscula e minuscula. Numeros e caracteres especiais."
      );
    }

    // Generate a salt for password hashing using bcrypt
    const salt = await bcrypt.genSalt(SALT_ROUNDS);

    // Hash the user's password using the generated salt
    const hashedPassword = await bcrypt.hash(form.password, salt);

    // Create a new user in the database with the hashed password
    const business = await BusinessModel.create({
      ...form,
      passwordHash: hashedPassword,
    });

    // Remove the passwordHash from the user object to avoid returning the hashed password in the response (for security reasons)
    business.passwordHash = undefined;

    // Return the newly created user as a JSON response with status code 201 (Created)
    return res.status(201).json(business);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

businessRoute.post("/login", async (req, res) => {
  try {
    const form = req.body;
    if (!form.email || !form.password) {
      throw new Error("Por favor, preencha todos os dados!");
    }

    // procuro o user pelo email dentro do banco de dados
    const business = await BusinessModel.findOne({ email: form.email });

    //compare() também retorna TRUE se for igual as senhas e retorna FALSE se a senha não foi igual!!
    if (await bcrypt.compare(form.password, business.passwordHash)) {
      //senhas iguais, pode fazer login

      //gerar um token
      const token = generateToken(business);

      // Remove the passwordHash from the user object to avoid returning the hashed password in the response (for security reasons)
      business.passwordHash = undefined;

      return res.status(200).json({
        user: business,
        token: token,
      });
    } else {
      //senhas diferentes, não pode fazer login
      throw new Error(
        "Email ou senha não são válidos. Por favor tenta novamente."
      );
    }
  } catch (error) {
    //handler error
    console.log(error);
    return res.status(500).json(error);
  }
});

businessRoute.get("/profile", isAuth, async (req, res) => {
    try {

        const id_business = req.auth._id;

        const business = await BusinessModel.findById(id_business).select("-passwordHash").populate("offers")

        return res.status(200).json(business);
        
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
        
    }
})


businessRoute.put("/edit", isAuth, async (req, res) => {

    try {

        const id_business = req.auth._id;

        const updatedBusiness = await BusinessModel.findByIdAndUpdate(
            id_business,
            { ...req.body },
            {new: true, runValidators: true } //por padrao o mongo nao confere a schema
        ).select("-passwordHash");

        return res.status(200).json(updatedBusiness);
        
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
        
    }
})


businessRoute.delete("/delete", isAuth, async (req, res) => {
    try {
        const id_business = req.auth._id;

        const deletedBusiness = await BusinessModel.findByIdAndUpdate(
            id_business,
            {active: false}
        );

        return res.status(200).json(deletedBusiness);
        
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
        
    }
})
//exportar a rota
export default businessRoute;
