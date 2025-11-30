import React, { useEffect, useState } from 'react'
import Navbar from '../shared/Navbar'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { RadioGroup } from '../ui/radio-group'
import { Button } from '../ui/button'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { USER_API_END_POINT } from '@/utils/constant'
import { toast } from 'sonner'
import { useDispatch, useSelector } from 'react-redux'
import { setLoading, setUser } from '@/redux/authSlice'
import { Loader2 } from 'lucide-react'

const Login = () => {
    const [input, setInput] = useState({
        email: "",
        password: "",
        role: "",
    });
    const { loading, user } = useSelector(store => store.auth);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const changeEventHandler = (e) => {
        setInput({ ...input, [e.target.name]: e.target.value });
    }

    const validateInput = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!input.email || !emailRegex.test(input.email)) {
            toast.error("Please enter a valid email address.");
            return false;
        }

        // const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        // if (!strongPasswordRegex.test(input.password)) {
        //     toast.error("Password must be at least 8 characters, and include an uppercase, lowercase, number, and special character.");
        //     return false;
        // }

        if (!input.role) {
            toast.error("Please select a role (Student or Recruiter).");
            return false;
        }

        return true;
    };


    const submitHandler = async (e) => {
        e.preventDefault();
        if (!validateInput()) {
            return;
        }

        try {
            dispatch(setLoading(true));
            const res = await axios.post(`${USER_API_END_POINT}/login`, input, {
                headers: {
                    "Content-Type": "application/json"
                },
                withCredentials: true,
            });
            if (res.data.success) {
                dispatch(setUser(res.data.user));
                navigate("/");
                toast.success(res.data.message);
            }
        } catch (error) {
            console.log(error);
            toast.error(error.response.data.message);
        } finally {
            dispatch(setLoading(false));
        }
    }

    useEffect(() => {
        if (user) {
            navigate("/");
        }
    }, [user, navigate]);

    return (
        <div className="bg-slate-100 min-h-screen">
            <Navbar />
            <div className='flex items-center justify-center max-w-7xl mx-auto'>
                <form onSubmit={submitHandler} className='w-1/2 border border-black rounded-md p-6 my-10 bg-white shadow-md'>
                    <h1 className='font-bold text-2xl mb-5 text-black'>Login</h1>

                    <div className='my-3'>
                        <Label className='text-black'>Email</Label>
                        <Input
                            type="email"
                            value={input.email}
                            name="email"
                            onChange={changeEventHandler}
                            placeholder="abc@xyz.com"
                            className='focus:ring-[#6A38C2] mt-3'
                        />
                    </div>

                    <div className='my-3'>
                        <Label className='text-black'>Password</Label>
                        <Input
                            type="password"
                            value={input.password}
                            name="password"
                            onChange={changeEventHandler}
                            placeholder="abc***"
                            className='focus:ring-[#6A38C2] mt-3'
                        />
                    </div>

                    <RadioGroup className="flex items-center gap-4 my-5">
                        <div className="flex items-center space-x-2">
                            <Input
                                type="radio"
                                name="role"
                                value="student"
                                checked={input.role === 'student'}
                                onChange={changeEventHandler}
                                className="cursor-pointer"
                            />
                            <Label htmlFor="r1" className='text-black'>Student</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Input
                                type="radio"
                                name="role"
                                value="recruiter"
                                checked={input.role === 'recruiter'}
                                onChange={changeEventHandler}
                                className="cursor-pointer"
                            />
                            <Label htmlFor="r2" className='text-black'>Recruiter</Label>
                        </div>
                    </RadioGroup>

                    {
                        loading ? (
                            <Button className="w-full my-4 bg-[#6A38C2] hover:bg-[#5930a9] text-white">
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' /> Please wait
                            </Button>
                        ) : (
                            <Button type="submit" className="w-full my-4 bg-[#6A38C2] hover:bg-[#5930a9] text-white">
                                Login
                            </Button>
                        )
                    }

                    <span className='text-sm text-black'>
                        Don't have an account? <Link to="/signup" className='text-[#6A38C2] underline'>Signup</Link>
                    </span>
                </form>
            </div>
        </div>
    )
}

export default Login