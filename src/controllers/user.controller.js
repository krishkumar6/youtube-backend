import { asyncHandler } from '../utils/asyncHandler.js'; 
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/User.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from "jsonwebtoken"

//make a method to generate tokens 
 const generateAccessRefreshTokens = async(userId) => {
   try{
       const user = await User.findById(userId)
       const accessToken =user.generateAccessToken()
       const refreshToken = user.generateRefreshToken()

       user.refreshToken = refreshToken
       await user.save({ validateBeforeSave:false})

       return {accessToken,refreshToken}


   } catch(error){
      throw new ApiError(500,"Something went wrong while generating refresh and access token")
   }
 }

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
     const existedUser = await User.findOne({
        $or:[{username},{email}]
     })
     if(existedUser){
        throw new ApiError(409,"User with email or username is already exist")
     }

      //check for cover image, check for avatar
      const avatarLocalPath = req.files?.avatar[0]?.path;
    //  const coverImagePath =req.files?.coverImage[0]?.Path;  iis mein check kuch dikat hai

    let coverImagePath ;
    if(req.files && Array.isArray(req.files.coverImagePath) && req.files.coverImagePath.length>0){
        coverImagePath = req.files.coverImagePath[0].path
    }

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

const loginUser= asyncHandler(async(req,res) => {
   // req body -> data
   //username or email
   //find the user
   //password check
   //access and refresh token
   //send cookie
   //response

   // req body -> data
   const{email,username,password}=req.body
    
   //username or email
   if(!username &&  !email){
      throw new ApiError(400,"username or email is required")
   }

    //find the user
   const user = await User.findOne({
      $or:[{username},{email}]
    })

    if(!user){
      throw new ApiError(401,"User does not exist")
    }
    //password check
     const isPasswordValid = await user.isPasswordCorrect(password)

     if(!isPasswordValid){
      throw new ApiError(401,"Invalid user credential")
    }
   

    //access and refresh token
    const{accessToken , refreshToken}= await generateAccessRefreshTokens(user._id)

    const loggedInUser = await User.findOne(user._id).select("-password -refreshToken")
    
     //send cookie
    const options = {
      httpOnly: true,
      secure:true
   }
    
   //response
   return res
   .status(200)
   .cookie("accessToken",accessToken,options)
   .cookie("refreshToken", refreshToken, options)
   .json(
      new ApiResponse(
         200,
         {
            user: loggedInUser,accessToken,refreshToken
         },
         "User logged In Successfully"
      )
   )

})
const logoutUser = asyncHandler(async(req,res) =>{
   //we make middleware for logout purpose name auth.middleware.js
  await User.findByIdAndUpdate(
      req.user._id,
      {
         $set:{
            refreshToken: undefined
         }
      },
      {
         new: true
      }
   )

   const options ={
      httpOnly:true,
      secure:true
   }

   return res
   .status(200)
   .clearCookie("accessToken",options)
   .clearCookie("refreshToken",options)
   .json(new ApiResponse(200,{},"User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req,res) =>{
   const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

   if(!incomingRefreshToken){
      throw new ApiError(401,"unauthorized request")
   }

   const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)

   const user = await User.findById(decodedToken?._id)

   if(!user){
      throw new ApiError(401,"Invalid refresh token")
   }
   if(incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401,"Refresh token is expired used")
   }

   const options = {
      httpOnly:true,
      secure: true
   }

   const{accessToken,newRefreshToken}= await generateAccessRefreshTokens(user._id)

   return res
   .status(200)
   .cookie("accessToken",accessToken , options)
   .cookie("refreshToken",newRefreshToken,options)
   .json(
      new ApiResponse(
         200,
         {accessToken,refreshToken:newRefreshToken},
         "Access token refreshed"
      )
   )

})

const changeCurrentPassword = asyncHandler(async(req,res) =>{
   const {oldPassword , newPassword , confirmedPassword} = req.body

   if(!(newPassword === confirmedPassword)){
      throw new ApiError(400,"password is incorrect")
   }
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
      throw new ApiError(400,"Invalid old password")
    }
    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password changed successfully"))

})

const getCurrentUser = asyncHandler(async(req,res) =>{
    return res
    .status(200)
    .json(200,req.user,"current user fetched successfully")
})

const updateAccountDetails = asyncHandler(async(req,res) =>{
   const {fullname , email} = req.body

   if(!fullname || !email){
      throw new ApiError(400,"All field are required")
   }

   const user = User.findByIdAndUpdate(
      req.user?._id,
      {
         $set:{
            fullname:fullname,
            email:email
         }
      },
      {new : true}
   ).select("-password")

   return res
   .status(200)
   .json(new ApiResponse(200,user,"Account details update successfully"))

})

const updateUserAvatar = asyncHandler(async(req,res) =>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
       throw new ApiError(400,"Avatar file is missing")
    }
     const avatar = await uploadOnCloudinary(avatarLocalPath)
     if(!avatar.url){
       throw new ApiError(400,"Error while uploading on avatar")
     }
   const user =  await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set:{
            avatar:avatar.url
         }
      },
      {new : true}
     ).select("-password")

      return res
     .status(200)
     .json(200,user,"avatar updated successfully")


})

const updateUserCoverImage = asyncHandler(async(req,res) =>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
       throw new ApiError(400,"cover image file is missing")
    }
     const coverImage = await uploadOnCloudinary(avatarLocalPath)
     if(!coverImage.url){
       throw new ApiError(400,"Error while uploading on coverImage")
     }
    const user= await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set:{
            coverImage:coverImage.url
         }
      },
      {new : true}
     ).select("-password")

     return res
     .status(200)
     .json(200,user,"cover Image updated successfully")

})



export { 
   registerUser,
   loginUser,
   logoutUser,
   refreshAccessToken,
   changeCurrentPassword,
   getCurrentUser,
   updateAccountDetails,
   updateUserAvatar,
   updateUserCoverImage
}