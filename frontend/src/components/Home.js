import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import "../styles/Home.css";  

const Home = () => {
    const [user, setUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [newPostImage, setNewPostImage] = useState(null);
    const navigate = useNavigate();
    const isAdmin = localStorage.getItem("is_admin") === "true";

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                const userResponse = await axios.get('http://127.0.0.1:8000/api/user/', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setUser(userResponse.data);

                const postsResponse = await axios.get('http://127.0.0.1:8000/api/posts/following/', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setPosts(postsResponse.data);
            } catch (error) {
                console.error('Error fetching data', error);
                localStorage.removeItem('token');
                navigate('/login');
            }
        };

        fetchData();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim() && !newPostImage) {
            alert('Please enter some text or upload an image.');
            return;
        }

        const formData = new FormData();
        formData.append('content', newPostContent);
        if (newPostImage) {
            formData.append('image', newPostImage);
        }

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('http://127.0.0.1:8000/api/posts/', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
            });
            setPosts([response.data, ...posts]);
            setNewPostContent('');
            setNewPostImage(null);
        } catch (error) {
            console.error('Error creating post', error);
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

    const handleLike = async (postId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`http://127.0.0.1:8000/api/posts/${postId}/like/`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setPosts((prevPosts) =>
                prevPosts.map((post) =>
                    post.id === postId
                        ? {
                            ...post,
                            likes_count: post.likes.includes(user.id) ? post.likes_count - 1 : post.likes_count + 1,
                            likes: post.likes.includes(user.id)
                                ? post.likes.filter(id => id !== user.id)
                                : [...post.likes, user.id]
                        }
                        : post
                )
            );
        } catch (error) {
            console.error('Error liking post', error);
        }
    };

    const handleShare = async (postId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`http://127.0.0.1:8000/api/posts/${postId}/share/`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setPosts((prevPosts) =>
                prevPosts.map((post) =>
                    post.id === postId ? { ...post, shares_count: post.shares_count + 1 } : post
                )
            );
        } catch (error) {
            console.error('Error sharing post', error);
        }
    };

    return (
        <div>
            {/* ✅ Header เมนูด้านบน */}
            <div className="header">
                <div className="header-left">
                    {user && (
                        <>
                            <img src={user.profile_picture || 'https://via.placeholder.com/40'} alt="Profile" className="profile-picture" />
                            <span className="user-name" ><Link to={`/profile/${user.id}`} className="nav-button">{user.first_name} {user.last_name}</Link></span>
                            
                            <Link to="/home" className="nav-button">Timeline</Link>
                            <Link to="/contact" className="nav-button">Contact</Link>
                        </>
                    )}
                </div>
                <button onClick={handleLogout} className="logout-button">Logout</button>
            </div>

            {/* ✅ เนื้อหาหลักของหน้า Home */}
            <div className="content">
                <div className="new-post">
                    <textarea value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} placeholder="What's on your mind?" className="post-input" />
                    <input type="file" onChange={(e) => setNewPostImage(e.target.files[0])} className="file-input" />
                    <button onClick={handleCreatePost} className="post-button">Post</button>
                </div>

                {posts.map((post) => (
                    <div key={post.id} className="post">
                        <div className="post-header">
                            <img src={post.author.profile_picture || 'https://via.placeholder.com/40'} alt="Author" className="post-author-picture" />
                            <span className="post-author-name">
                                <Link to={`/profile/${post.author.id}`} className="profile-link">{post.author.first_name} {post.author.last_name}</Link>
                            </span>
                        </div>

                        {/* ✅ แสดงโพสต์ที่แชร์ */}
                        {post.shared_from?.author && (
                            <div className="shared-from-container">
                                <span className="shared-by">Shared from</span>
                                <img src={post.shared_from.author.profile_picture || 'https://via.placeholder.com/30'} alt="Shared Author" className="shared-from-profile-picture" />
                                <Link to={`/profile/${post.shared_from.author.id}`} className="shared-from-name">
                                    {post.shared_from.author.first_name} {post.shared_from.author.last_name}
                                </Link>
                            </div>
                        )}

                        {/* ✅ แสดงเนื้อหาโพสต์ */}
                        <p className="post-content">{post.content}</p>
                        {post.image && <img src={post.image} alt="Post" className="post-image" />}
                        <small className="post-date">{new Date(post.created_at).toLocaleString()}</small>

                        {/* ✅ ปุ่ม Like, Share, Delete */}
                        <div className="post-actions">
                            <button onClick={() => handleLike(post.id)} className="action-button">Like ({post.likes_count})</button>
                            <button onClick={() => handleShare(post.id)} className="action-button">Share ({post.shares_count})</button>
                            {(post.author.id === user?.id || post.shared_by?.id === user?.id || isAdmin) && (
                                <button onClick={() => handleDeletePost(post.id)} className="delete-button">Delete</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Home;

