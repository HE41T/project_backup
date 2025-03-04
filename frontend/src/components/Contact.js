import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Contact.css'; // ✅ Import CSS

const Contact = () => {
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const navigate = useNavigate();
    const isAdmin = localStorage.getItem("is_admin") === "true";  

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        try {
            const currentUserResponse = await axios.get('http://127.0.0.1:8000/api/user/', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setCurrentUser(currentUserResponse.data);

            const usersResponse = await axios.get('http://127.0.0.1:8000/api/users/', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUsers(usersResponse.data);
        } catch (error) {
            console.error('Error fetching data', error);
        }
    };

    const handleFollowToggle = async (targetUserId, isFollowing) => {
        try {
            const token = localStorage.getItem('token');
            const url = `http://127.0.0.1:8000/api/users/${targetUserId}/${isFollowing ? 'unfollow' : 'follow'}/`;

            await axios.post(url, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setUsers((prevUsers) =>
                prevUsers.map((user) =>
                    user.id === targetUserId ? { ...user, is_following: !isFollowing } : user
                )
            );
        } catch (error) {
            console.error('Error toggling follow status', error);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://127.0.0.1:8000/api/admin/users/${userId}/delete/`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setUsers(users.filter(user => user.id !== userId));
        } catch (error) {
            console.error('Error deleting user', error);
            alert("Failed to delete user. Please try again.");
        }
    };

    return (
        <div className="contact-container">
            {/* ✅ Header ที่แสดงข้อมูลของผู้ที่ล็อกอิน */}
            <div className="header">
                <div className="header-left">
                    {currentUser && (
                        <>
                            <img src={currentUser.profile_picture || 'https://via.placeholder.com/40'} alt="Profile" className="profile-picture" />
                            <span className="user-name"><Link to={`/profile/${currentUser.id}`} 
                            className="nav-button">{currentUser.first_name} {currentUser.last_name}</Link></span>
                            
                            <Link to="/home" className="nav-button">Timeline</Link>
                            <Link to="/contact" className="nav-button">Contact</Link>
                        </>
                    )}
                </div>
                <button onClick={() => navigate('/login')} className="logout-button">Logout</button>
            </div>

            <h2>Contact</h2>
            <div className="user-list">
                {users.map((user) => (
                    <div key={user.id} className="user-card">
                        <img src={user.profile_picture || 'https://via.placeholder.com/50'} alt="Profile" className="profile-picture-small" />
                        <Link to={`/profile/${user.id}`} className="user-list-name">
                            {user.first_name} {user.last_name}
                        </Link>
                        <span >@{user.username}</span>
                        {user.id.toString() === localStorage.getItem("user_id") ? (
                            <span className="self-text">This is you</span>
                        ) : (
                            <button className="follow-button" onClick={() => handleFollowToggle(user.id, user.is_following)}>
                                {user.is_following ? 'Unfollow' : 'Follow'}
                            </button>
                        )}

                        {isAdmin && (
                            <button onClick={() => handleDeleteUser(user.id)} className="delete-button">
                                Delete User
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Contact;
