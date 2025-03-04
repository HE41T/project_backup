import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/EditProfile.css'; 

const EditProfile = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [profilePicture, setProfilePicture] = useState(null);
    const navigate = useNavigate();

    const fetchUserData = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            const response = await axios.get('http://127.0.0.1:8000/api/user/', {
                headers: { Authorization: `Bearer ${token}` },
            });

            setFirstName(response.data.first_name);
            setLastName(response.data.last_name);
            setProfilePicture(response.data.profile_picture);
        } catch (error) {
            console.error('Error fetching user data', error);
        }
    }, [navigate]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    const handleProfilePictureChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfilePicture(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
    
        const formData = new FormData();
        formData.append('first_name', firstName || '');
        formData.append('last_name', lastName || '');
        if (profilePicture instanceof File) {
            formData.append('profile_picture', profilePicture);
        }
    
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
    
        try {
            const response = await axios.put('http://127.0.0.1:8000/api/user/', formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
            });

            setProfilePicture(response.data.profile_picture + `?timestamp=${Date.now()}`);
            fetchUserData();
            navigate(`/profile/${localStorage.getItem("user_id")}`);
        } catch (error) {
            console.error('Error updating profile', error);
        }
    };

    return (
        <div className="edit-profile-container">
            <h2>Edit Profile</h2>
            {profilePicture && (
                <img 
                    src={profilePicture instanceof File ? URL.createObjectURL(profilePicture) : `${profilePicture}?timestamp=${Date.now()}`} 
                    alt="Profile" 
                    className="profile-picture-preview" 
                />
            )}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>First Name : </label>
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Last Name : </label>
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
                <div className="profile-picture-upload">
    <input type="file" onChange={handleProfilePictureChange} />
    <button type="submit" className="save-button">Save Changes</button>
</div>

                
                <button type="button" className="back-button" onClick={() => navigate(`/profile/${localStorage.getItem("user_id")}`)}>
                    Back to Profile
                </button>
            </form>
        </div>
    );
};

export default EditProfile;
