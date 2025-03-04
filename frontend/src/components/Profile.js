import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import '../styles/Profile.css';  // ✅ Import CSS

const Profile = () => {
    const { user_id } = useParams();  // ✅ รับ user_id ของโปรไฟล์ที่กำลังดู
    const [user, setUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const navigate = useNavigate();
    const isAdmin = localStorage.getItem("is_admin") === "true";
    const currentUserId = localStorage.getItem("user_id");
    const isOwnProfile = currentUserId === user_id;

    useEffect(() => {
        fetchCurrentUser();  // ✅ โหลดข้อมูลของผู้ใช้ที่ล็อกอิน
        fetchProfileData();  // ✅ โหลดข้อมูลโปรไฟล์ที่กำลังดู
    }, [user_id]);

    const fetchCurrentUser = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }
            const currentUserResponse = await axios.get('http://127.0.0.1:8000/api/user/', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setCurrentUser(currentUserResponse.data);
        } catch (error) {
            console.error('Error fetching current user', error);
        }
    };

    const fetchProfileData = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            const userResponse = await axios.get(`http://127.0.0.1:8000/api/users/${user_id}/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUser(userResponse.data);

            const postsResponse = await axios.get(`http://127.0.0.1:8000/api/users/${user_id}/posts/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setPosts(postsResponse.data);
        } catch (error) {
            console.error('Error fetching data', error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleFollowToggle = async () => {
        try {
            const token = localStorage.getItem('token');
            const url = `http://127.0.0.1:8000/api/users/${user_id}/${user.is_following ? 'unfollow' : 'follow'}/`;

            await axios.post(url, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setUser((prevUser) => ({
                ...prevUser,
                is_following: !prevUser.is_following,
                followers_count: prevUser.is_following ? prevUser.followers_count - 1 : prevUser.followers_count + 1
            }));
        } catch (error) {
            console.error('Error toggling follow status', error);
        }
    };

    const handleDeletePost = async (postId) => {
        try {
            const token = localStorage.getItem('token');
            const url = isAdmin 
                ? `http://127.0.0.1:8000/api/admin/posts/${postId}/delete/`
                : `http://127.0.0.1:8000/api/posts/${postId}/delete/`;

            await axios.delete(url, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setPosts(posts.filter((post) => post.id !== postId));
        } catch (error) {
            console.error('Error deleting post', error);
        }
    };

    if (!user || !currentUser) {
        return <div>Loading...</div>;
    }

    return (
        <div className="profile-container">
            {/* ✅ Header ที่แสดงข้อมูลของคนที่ล็อกอิน */}
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
                <button onClick={handleLogout} className="logout-button">Logout</button>
            </div>

            {/* ✅ Profile Header */}
            <div className="profile-header">
                <img src={user.profile_picture || 'https://via.placeholder.com/100'} alt="Profile" className="profile-picture-large" />
                <h2>{user.first_name} {user.last_name}</h2>
                <p>@{user.username}</p>

                <div className="profile-follow-info">
                    <Link to={`/profile/${user.id}/followers`} className="follow-link">Followers: {user.followers_count}</Link>
                    <Link to={`/profile/${user.id}/following`} className="follow-link">Following: {user.following_count}</Link>
                    <span className="follow-link">Posts: {user.posts_count}</span>
                </div>

                {isOwnProfile ? (
                    <Link to={`/profile/${user.id}/edit`} className="edit-button">Edit Profile</Link>
                ) : (
                    <button onClick={handleFollowToggle} className="follow-button">
                        {user.is_following ? "Unfollow" : "Follow"}
                    </button>
                )}
            </div>

            {/* ✅ User Posts */}
            <div className="profile-posts">
                {posts.map((post) => (
                    <div key={post.id} className="post">
                        <div className="post-header">
                            <img src={post.author?.profile_picture || 'https://via.placeholder.com/40'} alt="Author" className="post-author-picture" />
                            <span className="post-author-name">{post.author?.first_name} {post.author?.last_name}</span>

                            {post.shared_from?.author && (
                                <div className="shared-from-container">
                                    <p className="shared-by">Shared from</p>
                                    <img src={post.shared_from.author.profile_picture || 'https://via.placeholder.com/30'} alt="Shared Author" className="shared-from-profile-picture" />
                                    <p><Link to={`/profile/${post.shared_from.author.id}`} className="shared-from-name">
                                    {post.shared_from.author.first_name} {post.shared_from.author.last_name}</Link></p>
                                </div>
                            )}
                            
                            {/* ✅ เงื่อนไขให้ลบโพสต์ได้เฉพาะของตัวเองหรือแอดมินเท่านั้น */}
                            {(parseInt(post.author?.id) === parseInt(currentUserId) || isAdmin) && (
                                <button onClick={() => handleDeletePost(post.id)} className="delete-button">Delete</button>
                            )}
                        </div>  
                        <p className="post-content">{post.content}</p>
                        {post.image && <img src={post.image} alt="Post" className="post-image" />}
                        <small className="post-date">{new Date(post.created_at).toLocaleString()}</small>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Profile;
