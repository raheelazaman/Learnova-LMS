import React, { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useState, useContext } from 'react'
import { AppContext } from '../../context/AppContext'
import Loading from './Loading'
import { assets } from '../../assets/assets'
import humanizeDuration from 'humanize-duration'
import Footer from '../../components/student/Footer'
import YouTube from 'react-youtube'

const CourseDetails = () => {

  const {id} = useParams()

  const [courseData, setCourseData] = useState(null)
  const [openSections, setOpenSections] = useState({})
  const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(false)
  const [playerData, setPlayerData] = useState(null)
  

  const {allCourses, currency,calculateRating,calculateNoOfLectures,calculateCourseDuration,calculateChapterTime} = useContext(AppContext)

  const fetchCourseData = async()=>{
    const findCourse = allCourses.find(course => course._id === id)
    setCourseData(findCourse)
  }

   useEffect(()=>{
       fetchCourseData()
   },[allCourses])
  
   const toggleSection = (index)=>{
    setOpenSections((prev)=>(
        {...prev,
          [index]: !prev[index],
        }
    ))
   }
   
  return courseData ? (
    <>
       <div className='flex md:flex-row flex-col-reverse gap-10 relative items-start justify-between md:px-36 px-8 md:pt-30 pt-20 text-left'>
       <div className='absolute top-0 left-0 w-full h-section-height -z-1 bg-linear-to-b from-cyan-100/70'>

       </div>
        {/*Left Column */}
        <div className='text-left ml-0 pl-4 lg:pl-8 flex flex-col items-start justify-start text-black-500'> 
          <h1 className='text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-tight'>{courseData.courseTitle}</h1>
          <p className='pt-4 md:text-base text-sm ' dangerouslySetInnerHTML={{__html: courseData.courseDescription.slice(0,200)}}></p>

          {/*Review and Rating */}
          <div className='flex items-center space-x-2 pt-3 pb-1 text-sm'>
                    <p>{calculateRating(courseData)}</p>
                    <div className='flex'>
                      {[...Array(5)].map((_, index) => (
                        <img key={index} src={index < Math.floor(calculateRating(courseData)) ? assets.star: assets.star_blank} alt='' className='w-3.5 h-3.5' />
                      ))}
                    </div>
                    <p className='text-blue-600'>({courseData.courseRatings.length}{courseData.courseRatings.length > 1 ? 'ratings' : 'rating' })</p>

                    <p className=''>{courseData.enrolledStudents.length}{courseData.enrolledStudents.length > 1 ? 'students':'student'}</p>

                    <p className='text-sm'>Course By<span className='text-blue-600 underline'>Learnova</span></p>
                  </div>
              <div className='pt-8 text-gray-800'>
                <h2 cassName='text-xl font-semibold'>Course Structure</h2>
                  <div className='pt-5'>
                    {courseData.courseContent.map((chapter, index)=> (
                      <div key={index} className='border border-gray-300 bg-white mb-2 rounded'>
                        <div className='flex items-center justify-between px-4 py-3 cursor-pointer select-none' onClick={() => toggleSection(index)}>
                          <div className='flex items-center gap-2 '>
                            <img className={`transform transition-transform ${openSections[index]?'rotate-270':''}`}
                            src={assets.down_arrow_icon} alt="arrow icon" />
                            <p className='font-medium md:text-base text-sm'>{chapter.chapterTitle}</p>
                          </div>
                          <p className='text-sm md:text-default'>{chapter.chapterContent.length}lecture - {calculateChapterTime(chapter)}</p>
                        </div>
                        <div className={`overflow-hidden transition-all duration-300 ${openSections[index]?'max-h-96':'max-h-0'}`}>
                          <ul className='list-disc md:pl-10 pl-4 pr-4 py-2 text-gray-600 border-t border-gray-300'>
                            {chapter.chapterContent.map((lecture, i)=>(
                              <li key={i} className='flex items-start gap-2 py-1'>
                                <img src={assets.play_icon} alt="play icon" className='w-4 h-4 mt-1'/>
                                <div className='flex items-center justify-between w-full text-gray-800 text-xs md:text-default'>
                                  <p>{lecture.lectureTitle}</p>
                                  <div className='flex gap-2'>
                                    {lecture.isPreviewFree && <p
                                    onClick={()=> setPlayerData({
                                      videoId:lecture.lectureUrl.split('/').pop()
                                    })}
                                    className='text-blue-500 cursor-pointer'>Preview</p>}
                                    <p>{humanizeDuration(lecture.lectureDuration * 60 * 1000,{units:['h','m']})}</p>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>

              </div>
            <div className='pt-8 pb-6 text-sm md:text-default'>
              <h3 className='text-xl font-semibold text-gray-800'>Course Description</h3>
                 <p className='pt-4 rich-text' dangerouslySetInnerHTML={{__html: courseData.courseDescription}}></p>
            </div>

        </div>
                {/* Right Column */}
        <div className='max-w-106 z-10 shadow-lg round-t md:rounded-none overflow-hideen bg-white min-w-75 sm:min-w-105'>
          {
             playerData ? 
                 <YouTube videoId={playerData.videoId} opts={{playerVars: {autoplay:1}}} 
                 iframeClassName='w-full aspect-video' />
                : <img src={courseData.courseThumbnail} alt="" />
          }
          

          <div className='p-5'>
            <div className='flex items-center gap-2'>

              <img
                className='w-3.5'
                src={assets.time_left_clock_icon}
                alt="time left clock icon"
              />
              
             
              <p className='text-red-500'>
                <span className='font-medium'>5 days</span> left at this price
              </p>
            </div>

            <div className='flex gap-3 items-center pt-2'>
              <p className='text-gray-800 md:text-4xl text-2xl font-semibold'>{currency}{(courseData.coursePrice - courseData.discount * courseData.coursePrice/100).toFixed(2)}</p>
              <p className='md:text-xl text-gray-500 line-through'>{courseData.coursePrice}</p>
              <p className='text-gray-500 md:text-lg'>{courseData.discount}% off</p>
            </div>

            < div className='flex items-center text-sm md:text-default gap-4 pt-2 md:pt-4 text-black-500 '>
              <div className='flex items-center gap-1'>
                <img src={assets.star} alt="star icon" />
                <p>{calculateRating(courseData)}</p>
              </div>

              <div className='h-4 w-px bg-gray-500/40'></div>

                 <div className='flex items-center gap-1'>
                   <img src={assets.time_clock_icon} alt="clock icon" />
                   <p>{calculateCourseDuration(courseData)}</p>
                 </div>
                
              
              <div className='h-4 w-px bg-gray-500/40'></div>
                 <div className='flex items-center gap-1'>
                   <img src={assets.lesson_icon} alt="clock icon" />
                   <p>{calculateNoOfLectures(courseData)} lessons</p>
                 </div>
            </div>

            <button className='md:mt-6 mt-4 w-full py-3 rounded bg-blue-600 text-white font-medium'>{isAlreadyEnrolled ? 'Already Enrolled':'Enroll Now'}</button>
            <div className='pt-6'>
              <p className='md:text-xl text-lg font-medium text-gray-800'>What's in this Course</p>
              <ul className='ml-4 pt-2 text-sm md:text-default list-disc text-gray-500'>
                <li>lifetime access with free update</li>
                <li>Step-by-step, hands-on project guidance</li>
                <li>Downloadable resourses and source code</li>
                <li>Quizzes to test your knowledge</li>
                <li>Certificate after successful completion</li>

                
              </ul>
            </div>
          </div>
        </div>

      </div>
      <Footer/>
    </>
  ) : <Loading />
}

export default CourseDetails
