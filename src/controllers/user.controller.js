import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../utils/User.js";
import {uploadOnCloudinary} from "../utils/uploadOnCloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async(req,res)=>{
   
    const{fullname,email,username,password} = req.body;

    if([fullname,email,username,password].some((field)=>field?.trim()===""))
    {
        throw new ApiError("all fiels are required",400)
    }

    const existtedUser=User.findOne({
        $or:[
            {username},
            {email},
        ]
    })

    if(existtedUser)
    {
        throw new ApiError("username or email already exist",409)
    }

    const avatarlocalPath = req.files?.avatar[0].path;
    const coverImagelocalPath = req.files?.coverImage[0].path;

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

    return res.status(201).json({
        new ApiResponse(200,createdUser,"User registered successfully")
    })

} )

export {registerUser}