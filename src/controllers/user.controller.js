import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken = async (userId)=>{
    try {
        const user = await User.findById(userId);
        const accessToken=user.generateAccessToken();
        const refreshToken=user.generateRefreshToken();

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave:false });

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError("Error generating access token",500);
    }
}

const registerUser = asyncHandler(async(req,res)=>{
   
    const{fullname,email,username,password} = req.body;

    if([fullname,email,username,password].some((field)=>field?.trim()===""))
    {
        throw new ApiError("all fiels are required",400)
    }

    const existtedUser= await User.findOne({
        $or:[
            {username},
            {email},
        ]
    })

    if(existtedUser)
    {
        throw new ApiError("username or email already exist",409)
    }

    let coverImagelocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImagelocalPath = req.files.coverImage[0].path
    }

    const avatarlocalPath = req.files?.avatar[0].path;
    

    if(!avatarlocalPath){
        throw new ApiError("Avatar is required",400)
    }

    const avatar = await uploadOnCloudinary(avatarlocalPath)
    const coverImage = await uploadOnCloudinary(coverImagelocalPath)

    

    if(!avatar){
        throw new ApiError("Failed to upload avatar",400)
    }

    const user = await User.create({
        fullname,
        email,
        username:username.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )

} )

const loginUser = asyncHandler(async (req, res) =>{
    const {username, password, email} = req.body;

    if(!(username || email)){
        throw new ApiError("Username and email are required",400)
    }

    const user = await User.findOne({
        $or:[
            {username},
            {email},
        ]
    })

    if(!user){
        throw new ApiError("User not found",404)
    }

    const isPassswordValid = await user.isPassswordValid(password)

    if(!isPassswordValid){
        throw new ApiError("Invalid credentials",401)
    }

    const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure:true,    
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,
            {
                user: loggedInUser,
                accessToken,
                refreshToken: refreshToken.token,
            },
            "User logged in successfully")
    )
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        { 
            $set:{
                refreshToken: null,
            }
         },
        { new: true }
    )
    const options = {
        httpOnly: true,
        secure:true,    
    }

    return res
   .status(200)
   .clearCookie("accessToken",options)
   .clearCookie("refreshToken",options)
   .json(
    new ApiResponse(200,{},"User logged out")
   )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
   const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken 

   if(!incomingRefreshToken){
    throw new ApiError("Refresh token is required",401)
   }

   try {
    const decodedToken=jwt.verify(
     incomingRefreshToken,
     process.env.REFRESH_TOKEN_SECRET,
    )
 
    const user=await user.findById(decodedToken?._id)
 
    if(!user){
     throw new ApiError("Refresh token is invalid",401)
    }
 
    if(incomingRefreshToken!==user?.refreshToken){
     throw new ApiError("Refresh token has expired",401)
    }
    
    const options={
     httpOnly: true,
     secure:true,
    }
 
    const{accessToken,newRefreshToken}=await generateAccessAndRefreshToken(user._id)
 
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",newRefreshToken,options)
    .json(
     new ApiResponse(200,
         {
             user: user.select("-password -refreshToken"),
             accessToken: accessToken,
             refreshToken: newRefreshToken,
         },
         "User access token refreshed")
     )
   } catch (error) {
        throw new ApiError(error.message,401)
   }

});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}