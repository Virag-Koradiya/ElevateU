import React, { useEffect, useState } from 'react'
import Navbar from '../shared/Navbar.jsx'
import { Input } from '../ui/input.jsx'
import { Button } from '../ui/button.jsx' 
import { useNavigate } from 'react-router-dom' 
import { useDispatch } from 'react-redux' 
import AdminJobsTable from './AdminJobsTable.jsx'
import useGetAllAdminJobs from '@/hooks/useGetAllAdminJobs.jsx'
import { setSearchJobByText } from '@/redux/jobSlice'

const AdminJobs = () => {
  useGetAllAdminJobs();
  const [input, setInput] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setSearchJobByText(input));
  }, [input]);
  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <section className='max-w-6xl mx-auto my-10'>
        <div className='flex items-center justify-between my-5'>
          <Input
            className="w-fit  bg-indigo-50 border border-purple-500"
            placeholder="Filter by name, role"
            onChange={(e) => setInput(e.target.value)}
          />
          <Button onClick={() => navigate("/admin/jobs/create")}>New Jobs</Button>
        </div>
        <AdminJobsTable />
      </section>
    </div>
  )
}

export default AdminJobs