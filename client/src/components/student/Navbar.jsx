
import { assets } from '../../assets/assets'
import { Link } from 'react-router-dom'
import {useClerk, UserButton, useUser} from '@clerk/react'

const Navbar = () => {

  const isCourseListPage = location.pathname.includes('/course-list')
  //Add functionalty on the button that will open login form
  const {openSignIn} = useClerk();
  //We will get the user object from the useUser hook to check if the user is logged in or not
  const {user} = useUser();

  return (
    <div className={`flex items-center justify-between px-4 sm:px-10 md:px-14 lg:px-36 border-b border-gray-500 py-4 ${isCourseListPage ? 'bg-white' : 'bg-cyan-100/70'}`}>
      <img src={assets.logo_lms} alt="Logo" className='w-28 lg:w-32 cursor-pointer' />
      <div className='hidden md:flex items-center gap-5 text-gray-500'>
        <div className ='flex items-center gap-5'>
          { user && <>
            <button>Become Educator</button>
          | <Link to='/my-enrollments'>My Enrollments</Link>
           </>
          }
        </div>
        {/*We will check if the user is logged in or not, if the user is logged in we will show the UserButton component which will show the user's profile picture and when clicked it will show a dropdown with the user's name and email and a logout button, if the user is not logged in we will show a button that will open the login form*/}
        { user ? <UserButton/> :
          <button onClick={() => openSignIn()} className='bg-blue-600 text-white px-5 py-2 rounded-full'>Create Account</button>}
      </div>
      {/* For Mobile Screens*/}
      <div className='md:hidden flex items-center gap-5 text-gray-500'>
        <div className='flex items-center gap-1 sm:gap-2 max-sm:text-xs'>
           { user &&
            <>
            <button>Become Educator</button>
          | <Link to='/my-enrollments'>My Enrollments</Link> 
          </>
          } 
        </div>
        { user ? <UserButton/> :
        <button onClick={()=> openSignIn()}><img src= {assets.user_icon} alt="" /></button>
        }
      </div>
    </div>
  )
}

export default Navbar
