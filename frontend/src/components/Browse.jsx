import React, { useEffect } from "react";
import Navbar from "./shared/Navbar";
import Job from "./Job";
import { useDispatch, useSelector } from "react-redux";
import { setSearchedQuery } from "@/redux/jobSlice";
import useGetAllJobs from "@/hooks/useGetAllJobs";

const Browse = () => {
  useGetAllJobs();
  const { allJobs } = useSelector((store) => store.job);
  const dispatch = useDispatch();
  useEffect(() => {
    return () => {
      dispatch(setSearchedQuery(""));
    };
  }, []);
  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <div className="bg-slate-100">
        <div className="bg-slate-100 max-w-7xl mx-auto my-2">
          <h1 className="font-bold text-xl my-2">
            Search Results ({allJobs.length})
          </h1>
          <div className="grid grid-cols-3 gap-4">
            {allJobs.map((job) => {
              return <Job key={job._id} job={job} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Browse;
