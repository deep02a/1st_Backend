const asyncHandler = (requestHandler)=>{
    return (res,req,next) => {
        Promise.resolve(requestHandler(req,res,next)).catch(err => {next(err);});
    }
}



export {asyncHandler}