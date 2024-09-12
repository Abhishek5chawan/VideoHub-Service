import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const generateRefreshAndAccessToken = async (userid) => {
    try {
        const user = await User.findById(userid)
        if(user) {
            const accessToken = user.generateAccessToken()
            const refreshToken = user.generateRefreshToken()
            user.refreshToken = refreshToken
            await user.save({ValidateBeforeSave: false})
            return {accessToken, refreshToken}
        }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    //get user details from frontend
    //validation -not empty email formate
    //check if user already exists: from username, email
    //check for images, check for avatar
    //upload them to cloudinary, check avatar is uploaded or not
    //create user object - create entry in db calls
    //remove password and refresh token field from response
    //check for user creation status
    //return response


    const {fullname, email, username, password} =req.body

    // console.log("request.body: ", req.body)

    // console.log("email:",email);

    if (
        [fullname, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if(existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;

    // console.log("req.files", req.files)
    
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    // const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    // console.log("Cover Image Upload:", coverImage);


    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        email,
        username: username.toLowerCase(),
        password,
        coverImage: coverImage?.url || "",
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
        // req body -> data
        // username or email to login
        //find the user
        //check for password
        //generate access and generate tokens
        //send through cookies


        const {email, username, password} = req.body

        if(!username && !email) {
            throw new ApiError(400, "Username or email is required")
        }

        const user = await User.findOne({
            $or: [{username}, {email}] //mondogb operators
        })

        if(!user) {
            throw new ApiError(404, "User not found")
        }

        const isPasswordValid = await user.isPasswordCorrect(password)

        if(!isPasswordValid) {
            throw new ApiError(401, "Invalid Password")
        }

        const {accessToken, refreshToken} = await generateRefreshAndAccessToken(user._id)

        const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

        const options = {
            httpOnly: true,
            secure: true,
        }

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        user: loggedInUser, refreshToken, accessToken
                    },
                    "User logged in successfully"))
})

const logoutUser = asyncHandler(async(req, res) => {
        User.findByIdAndUpdate(
            req.user._id,
            {
                $set: {
                    refreshToken: undefined
                }
            },
            {
                new: true
            }
        )

        const options = {
            httpOnly: true,
            secure: true,
        }

        return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"))
})


export { registerUser,
        loginUser,
        logoutUser,
}