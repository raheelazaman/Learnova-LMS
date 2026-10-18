import React, { useContext, useState } from 'react'
import { AppContext } from '../../context/AppContext'
import {Line} from 'rc-progress'
import Footer from '../../components/student/Footer'

const MyEnrollments = () => {
  const {enrolledCourses, calculateCourseDuration, navigate} =useContext(AppContext)

  const [progressArray, setProgressArray] = useState([
    {lectureCompleted:2 ,totalLectures:4},
    {lectureCompleted:8 ,totalLectures:8},
    {lectureCompleted:0 ,totalLectures:4},
    {lectureCompleted:4 ,totalLectures:6},
    {lectureCompleted:7 ,totalLectures:7},
    {lectureCompleted:0 ,totalLectures:3},
    {lectureCompleted:0 ,totalLectures:5},
    {lectureCompleted:4 ,totalLectures:4},
    {lectureCompleted:7 ,totalLectures:10},
    {lectureCompleted:5 ,totalLectures:10}

  ])
  return (
    <>
    <div className='md:px-36 pt-10 px-8'>
        <h1 className='text-2xl font-semibold '>My Enrollments Page</h1>
        <table className='md:table-auto table-fixed w-full overflow-hidden border mt-10'>
          <thead className='text-gray-900 border-gray-500/40 border-b text-sm text-left max-sm:hidden'>
            <tr>
              <th className='px-4 py-3 font-semibold truncate'>Course</th>
              <th className='px-4 py-3 font-semibold truncate'>Duration</th>
              <th className='px-4 py-3 font-semibold truncate'>Completion</th>
              <th className='px-4 py-3 font-semibold truncate'>Status</th>
            </tr>
          </thead>
          <tbody className='text-gray-700'>
            {enrolledCourses.map((course,index)=>(
              <tr key={index} className='border-b border-gray-500/20'>
                <td className='md:px-4 pl-4 md:pl-4 py-3 flex items-center space-x-3'>
                  <img src={course.courseThumbnail} alt="" className='w-14 sm:w-24 md:w-28' />
                  <div className='flex-1'>
                    <p className='mb-1 max-sm:text-sm'>{course.courseTitle}</p>
                    <Line strokeWidth={2} percent={progressArray[index] ? (progressArray[index].lectureCompleted * 100) / progressArray[index].totalLectures : 0} className='bg-gray-300 rounded-full'/>
                  </div>
                </td>
                <td className='px-4 py-3 max-sm:hidden'>
                  {calculateCourseDuration(course)}
                </td>
                <td className='px-4 py-3 max-sm:hidden'>
                  {progressArray[index] && `${progressArray[index].lectureCompleted} / ${progressArray[index].totalLectures}`} <span>lectures</span>
                </td>
                <td className='px-4 py-3 max-sm:text-right'>
                  <button className='px-3 sm:px-5 py-1.5 sm:py-2 bg-blue-600 max-sm:text-xs text-white cursor-pointer'
                  onClick={()=>navigate('/player/' + course._id)}>
                    {progressArray[index] && progressArray[index].lectureCompleted / progressArray[index].totalLectures === 1 ? 'Completed':'On Going'}
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
    </div>
    <Footer/>
    </>
  )
}

export default MyEnrollments