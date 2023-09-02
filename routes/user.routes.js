// Import necessary modules and dependencies
import express from "express"; // Importing the Express.js framework.
import UserModel from "../model/user.model.js"; // Importing the UserModel, presumably a model for your user data.
import bcrypt from "bcrypt"; // Importing the bcrypt library for password hashing.
import generateToken from "../config/jwt.config.js";
import isAuth from "../middlewares/isAuth.js";
import userModel from "../model/user.model.js";


// Create an instance of Express Router
const userRouter = express.Router();

// Set the number of rounds for password hashing (default value: 10)
const SALT_ROUNDS = 10; // Configuring the number of iterations for the salt. Higher numbers increase security but take more time.

//SIGNUP
// Define a route for handling user signup requests
userRouter.post("/signup", async (req, res) => {
   try {
      // Log the request body (form data sent by the client)
      console.log(req.body);

      // Get the form data from the request body
      const form = req.body;

      // Check if the password meets certain requirements using a regular expression
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
      const user = await UserModel.create({
         ...form,
         passwordHash: hashedPassword,
      });

      // Remove the passwordHash from the user object to avoid returning the hashed password in the response (for security reasons)
      user.passwordHash = undefined;

      // Return the newly created user as a JSON response with status code 201 (Created)
      return res.status(201).json(user);

   } catch (err) {
      // If an error occurs during signup, log the error and return a JSON response with status code 500 (Internal Server Error)
      console.log(err);
      return res.status(500).json(err);
   }
});

//LOGIN
// Define a route for handling user login requests (empty for now, implementation not provided)
userRouter.post("/login", async (req, res) => {
   try {
      const form = req.body;
      if (!form.email || !form.password) {
         throw new Error("Por favor, preencha todos os dados!");
      }

      // procuro o user pelo email dentro do banco de dados
      const user = await UserModel.findOne({ email: form.email });

      //compare() também retorna TRUE se for igual as senhas e retorna FALSE se a senha não foi igual!!
      if (await bcrypt.compare(form.password, user.passwordHash)) {
         //senhas iguais, pode fazer login

         //gerar um token
         const token = generateToken(user)

         // Remove the passwordHash from the user object to avoid returning the hashed password in the response (for security reasons)
         user.passwordHash = undefined;

         return res.status(200).json({
            user: user,
            token: token,

         });
      } else {
         //senhas diferentes, não pode fazer login
         throw new Error(
            "Email ou senha não são válidos. Por favor tenta novamente."
         );
      }

   } catch (err) {
      // If an error occurs during login, log the error and return a JSON response with status code 500 (Internal Server Error)
      console.log(err);
      return res.status(500).json(err.message);
   }
});

//GET PROFILE
// Define a route for handling user profile requests (empty for now, implementation not provided)
userRouter.get("/profile", isAuth, async (req, res) => {
   try {
      const id_user = req.auth._id;

      const user = await UserModel.findById(id_user).select("-passwordHash").populate("history_jobs");

      return res.status(200).json(user)
   } catch (err) {
      console.log(err);
      return res.status(500).json(err);
   }
});

//EDIT USER

userRouter.put("/edit", isAuth, async (req, res) => {
   try {
      const id_user = req.auth._id;
      const updatedUser = await userModel.findByIdAndUpdate(
         id_user,
         {...req.body},
         {new: true, runValidators: true}
      );

      return res.status(200).json(updatedUser);
      
   } catch (error) {
      console.log(err);
      return res.status(500).json(err);
   }
})
// Export the userRouter, making it available for use in other parts of the application
export default userRouter;

