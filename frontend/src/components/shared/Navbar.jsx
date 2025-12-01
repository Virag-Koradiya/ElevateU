import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { Avatar, AvatarImage } from "../ui/avatar";
import { LogOut, User2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { USER_API_END_POINT } from "@/utils/constant";
import { setUser } from "@/redux/authSlice";
import { toast } from "sonner";

const Navbar = () => {
  const { user } = useSelector((store) => store.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const logoutHandler = async () => {
    try {
      const res = await axios.get(`${USER_API_END_POINT}/logout`, {
        withCredentials: true,
      });
      if (res.data.success) {
        dispatch(setUser(null));
        navigate("/");
        toast.success(res.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || "Logout failed. Try again."
      );
    }
  };

  return (
    <nav className="bg-black">
      <div className="flex items-center justify-between mx-auto max-w-7xl h-16 px-4">
        <div className="mb-4 md:mb-0">
          <img src="https://elevateu-oog5.onrender.com/static/elevateu_logo.png" alt="ElevateU Logo" className="h-10" />
        </div>

        <div className="flex items-center gap-12">
          <ul className="flex font-medium items-center gap-5">
            {user && user.role === "recruiter" ? (
              <>
                <li>
                  <Link className="text-white" to="/admin/companies">
                    Companies
                  </Link>
                </li>
                <li>
                  <Link className="text-white" to="/admin/jobs">
                    Jobs
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link className="text-white" to="/">
                    Home
                  </Link>
                </li>
                <li>
                  <Link className="text-white" to="/jobs">
                    Jobs
                  </Link>
                </li>
                <li>
                  <Link className="text-white" to="/browse">
                    Browse
                  </Link>
                </li>
              </>
            )}
          </ul>

          {!user ? (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="outline">Login</Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-[#6A38C2] hover:bg-[#5b30a6] text-white">
                  Signup
                </Button>
              </Link>
            </div>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <div className="cursor-pointer">
                  <Avatar>
                    <AvatarImage
                      src={user?.profile?.profilePhoto}
                      alt={`${user?.fullname}'s avatar`}
                    />
                  </Avatar>
                </div>
              </PopoverTrigger>

              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <Avatar>
                      <AvatarImage
                        src={user?.profile?.profilePhoto}
                        alt={`${user?.fullname}'s avatar`}
                      />
                    </Avatar>
                    <div>
                      <h4 className="font-medium">{user?.fullname}</h4>
                      <p className="text-sm text-muted-foreground">
                        {user?.profile?.bio}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col mt-3 text-gray-600 gap-2">
                    {user?.role === "student" && (
                      <Link to="/profile">
                        <Button
                          variant="link"
                          className="flex items-center gap-2 w-fit px-0"
                        >
                          <User2 size={16} />
                          View Profile
                        </Button>
                      </Link>
                    )}

                    <Button
                      onClick={logoutHandler}
                      variant="link"
                      className="flex items-center gap-2 w-fit px-0 text-red-600"
                    >
                      <LogOut size={16} />
                      Logout
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
