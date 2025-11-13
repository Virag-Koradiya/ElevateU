import React, { useEffect, useState } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { APPLICATION_API_END_POINT, JOB_API_END_POINT } from '@/utils/constant';
import { setSingleJob } from '@/redux/jobSlice';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';

const JobDescription = () => {
  const { singleJob } = useSelector(store => store.job);
  const { user } = useSelector(store => store.auth);
  const isInitiallyApplied =
    singleJob?.applications?.some(application => application.applicant === user?._id) || false;
  const [isApplied, setIsApplied] = useState(isInitiallyApplied);

  const params = useParams();
  const jobId = params.id;
  const dispatch = useDispatch();

  const applyJobHandler = async () => {
    try {
      const res = await axios.get(`${APPLICATION_API_END_POINT}/apply/${jobId}`, {
        withCredentials: true,
      });

      if (res.data.success) {
        setIsApplied(true);
        const updatedSingleJob = {
          ...singleJob,
          applications: [...singleJob.applications, { applicant: user?._id }],
        };
        dispatch(setSingleJob(updatedSingleJob));
        toast.success(res.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.data.message);
    }
  };

  useEffect(() => {
    const fetchSingleJob = async () => {
      try {
        const res = await axios.get(`${JOB_API_END_POINT}/get/${jobId}`, {
          withCredentials: true,
        });
        if (res.data.success) {
          dispatch(setSingleJob(res.data.job));
          setIsApplied(
            res.data.job.applications.some(application => application.applicant === user?._id)
          );
        }
      } catch (error) {
        console.log(error);
      }
    };
    fetchSingleJob();
  }, [jobId, dispatch, user?._id]);

  return (
    <div className="bg-slate-100 min-h-screen py-10 px-4">
      <div className="max-w-5xl mx-auto  bg-indigo-50 border border-purple-500 p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-2xl text-gray-800">{singleJob?.title}</h1>
            <div className="flex items-center gap-2 mt-3">
              <Badge className="text-blue-700 font-bold" variant="ghost">
                {singleJob?.postion} Positions
              </Badge>
              <Badge className="text-[#F83002] font-bold" variant="ghost">
                {singleJob?.jobType}
              </Badge>
              <Badge className="text-[#7209b7] font-bold" variant="ghost">
                {singleJob?.salary} LPA
              </Badge>
            </div>
          </div>
          <Button
            onClick={isApplied ? null : applyJobHandler}
            disabled={isApplied}
            className={`rounded-lg ${
              isApplied
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-[#7209b7] hover:bg-[#5f32ad]'
            }`}
          >
            {isApplied ? 'Already Applied' : 'Apply Now'}
          </Button>
        </div>

        <h2 className="border-b-2 border-b-gray-300 font-semibold py-4 mt-6 text-lg">
          Job Description
        </h2>

        <div className="my-4 p-5 rounded-md space-y-3">
          <h1 className="font-bold">
            Role: <span className="pl-4 font-normal text-gray-800">{singleJob?.title}</span>
          </h1>
          <h1 className="font-bold">
            Location: <span className="pl-4 font-normal text-gray-800">{singleJob?.location}</span>
          </h1>
          <h1 className="font-bold">
            Description:{' '}
            <span className="pl-4 font-normal text-gray-800">{singleJob?.description}</span>
          </h1>
          <h1 className="font-bold">
            Experience:{' '}
            <span className="pl-4 font-normal text-gray-800">{singleJob?.experienceLevel} yrs</span>
          </h1>
          <h1 className="font-bold">
            Salary:{' '}
            <span className="pl-4 font-normal text-gray-800">{singleJob?.salary} LPA</span>
          </h1>
          <h1 className="font-bold">
            Total Applicants:{' '}
            <span className="pl-4 font-normal text-gray-800">
              {singleJob?.applications?.length}
            </span>
          </h1>
          <h1 className="font-bold">
            Posted Date:{' '}
            <span className="pl-4 font-normal text-gray-800">
              {singleJob?.createdAt?.split('T')[0]}
            </span>
          </h1>
        </div>
      </div>
    </div>
  );
};

export default JobDescription;
