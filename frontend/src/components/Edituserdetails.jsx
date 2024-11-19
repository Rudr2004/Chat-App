import React, { useEffect, useRef, useState } from 'react';
import Avatar from './Avtar.jsx'; // Assuming Avatar component is implemented correctly
import uploadFile from '../helper/uploadfile.jsx'; // Ensure this function is defined properly
import Divider from './Divider.jsx'; // Assuming Divider component is implemented correctly
import axios from 'axios';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { setUser } from '../redux/userSlice'; // Ensure this action is defined in your Redux slice

const EditUserDetails = ({ onClose, user }) => {
    const [data, setData] = useState({
        name: user?.user || '', // Default to empty string if user is not defined
        profile_pic: user?.profile_pic || ''
    });
    const uploadPhotoRef = useRef();
    const dispatch = useDispatch();

    // Update local state when user prop changes
    useEffect(() => {
        if (user) {
            setData((prev) => ({
                ...prev,
                name: user.user || '',
                profile_pic: user.profile_pic || ''
            }));
        }
    }, [user]);

    const handleOnChange = (e) => {
        const { name, value } = e.target;
        setData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleOpenUploadPhoto = (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadPhotoRef.current.click();
    };

    const handleUploadPhoto = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const uploadPhoto = await uploadFile(file);
                if (uploadPhoto && uploadPhoto.url) {
                    setData((prev) => ({
                        ...prev,
                        profile_pic: uploadPhoto.url
                    }));
                } else {
                    toast.error('Failed to upload photo.');
                }
            } catch (error) {
                console.error('Upload photo error:', error);
                toast.error('Error uploading photo.');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const URL = `http://localhost:8000/api/update-user`;
            const response = await axios.post(URL, data, { withCredentials: true });

            console.log('response', response);
            toast.success(response?.data?.message);

            if (response.data.success) {
                dispatch(setUser(response.data.data)); // Update the user in the Redux store
                onClose(); // Close the modal
            }
        } catch (error) {
            console.error('Error updating user details:', error.response ? error.response.data : error);
            toast.error('Error updating user details.');
        }
    };

    return (
        <div className='fixed top-0 bottom-0 left-0 right-0 bg-gray-700 bg-opacity-40 flex justify-center items-center z-10'>
            <div className='bg-white p-4 py-6 m-1 rounded w-full max-w-sm'>
                <h2 className='font-semibold'>Profile Details</h2>
                <p className='text-sm'>Edit user details</p>

                <form className='grid gap-3 mt-3' onSubmit={handleSubmit}>
                    <div className='flex flex-col gap-1'>
                        <label htmlFor='name'>Name:</label>
                        <input
                            type='text'
                            name='name'
                            id='name'
                            value={data.name}
                            onChange={handleOnChange}
                            className='w-full py-1 px-2 focus:outline-primary border-0.5'
                        />
                    </div>

                    <div>
                        <div>Photo:</div>
                        <div className='my-1 flex items-center gap-4'>
                            <Avatar
                                width={40}
                                height={40}
                                imageUrl={data?.profile_pic}
                                name={data?.name}
                            />
                            <label htmlFor='profile_pic'>
                                <button className='font-semibold' onClick={handleOpenUploadPhoto}>Change Photo</button>
                                <input
                                    type='file'
                                    id='profile_pic'
                                    className='hidden'
                                    onChange={handleUploadPhoto}
                                    ref={uploadPhotoRef}
                                />
                            </label>
                        </div>
                    </div>

                    <Divider />
                    <div className='flex gap-2 w-fit ml-auto'>
                        <button onClick={onClose} className='border-primary border text-primary px-4 py-1 rounded hover:bg-primary hover:text-white'>Cancel</button>
                    <button onClick={handleSubmit} className='border-primary bg-primary text-white border px-4 py-1 rounded hover:bg-secondary'>Save</button>
                </div>
            </form>
        </div>
    </div>
  )
}

export default React.memo(EditUserDetails)