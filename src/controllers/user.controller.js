import { asyncHandler } from '../utils/asyncHandler.js'; 
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/User.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from '../utils/ApiResponse.js';

const registerUser = asyncHandler(async(req,res)=>{
   //get user details from  frontend
   //validation - not empty
   //check if user already exist : username ,email
   //check for cover image, check for avatar
   //upload them to cloudinary , check avatar
   //create user object - create entry in db
   //remove password and refresh token field from response
   //check for user creation 
   //return res

    //get user details from  frontend
    const {username,fullname,email,password}=req.body // is body se sab detials aati hai

     //validation - not empty
     if(username===""){
        throw new ApiError(400,"username is required")
     }
      if(fullname===""){
        throw new ApiError(400,"fullname is required")
     }
      if(email===""){
        throw new ApiError(400,"email is required")
     }
      if(password===""){
        throw new ApiError(400,"password is required")
     }


     //check if user already exist : username ,email
     const existedUser = User.findOne({
        $or:[{username},{email}]
     })
     if(existedUser){
        throw new ApiError(409,"User with email or username is already exist")
     }

      //check for cover image, check for avatar
      const avatarLocalPath = req.files?.avatar[0]?.path;
      const coverImagePath =req.files?.coverImage[0]?.Path;

      if(!avatarLocalPath){
        throw new ApiError(400,"avatar file is required")
      }

       //upload them to cloudinary , check avatar
      const avatar = await uploadOnCloudinary(avatarLocalPath)
      const coverImage = await uploadOnCloudinary(coverImagePath)

      if(!avatar){
        throw new ApiError(400,"Avatar files is required")
      }

       //create user object - create entry in db
    const user = await User.create({
         fullname,
         avatar:avatar.url,
         coverImage:coverImage?.url || "",
         email,
         password,
         username: username.toLowerCase()
       })


       //remove password and refresh token field from response
       const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"  // mean ye select nahi hunge
       )

        //check for user creation
        if(!createdUser){
            throw new ApiError(500,"something went wrong while register the user")
        }

         //return res
         new res.status(201).json(
            new ApiResponse(200,createdUser,"User register successfully")
         )

})

export { registerUser}