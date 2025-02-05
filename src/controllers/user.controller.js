import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../utils/User.js";

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

} )

export {registerUser}