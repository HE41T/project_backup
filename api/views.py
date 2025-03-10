from rest_framework import generics, permissions, status
from rest_framework.generics import DestroyAPIView
from .serializers import RegisterSerializer, CustomTokenObtainPairSerializer, PostSerializer, FollowSerializer, UserSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from .models import Post,Follow,User
from django.db.models import Q

# View สำหรับการสมัครสมาชิก
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

# View สำหรับการเข้าสู่ระบบ
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

User = get_user_model()


class UserDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        data = request.data.copy()

        profile_picture = request.FILES.get('profile_picture')
        print("Uploaded File:", profile_picture)  # ✅ Debug ว่ามีไฟล์ถูกอัปโหลดมาหรือไม่

        if profile_picture:
            user.profile_picture = profile_picture  # ✅ บันทึกไฟล์รูปภาพใหม่

        serializer = self.get_serializer(user, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



class PostListCreateView(generics.ListCreateAPIView):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)  # บันทึกผู้เขียนโพสต์

class PostDeleteView(generics.DestroyAPIView):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Post.objects.filter(Q(author=self.request.user) | Q(shared_from__author=self.request.user))

class PostLikeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
            if request.user in post.likes.all():
                post.likes.remove(request.user)  # ยกเลิก Like
            else:
                post.likes.add(request.user)  # กด Like
            return Response({'status': 'success'}, status=status.HTTP_200_OK)
        except Post.DoesNotExist:
            return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)


class PostShareView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
            
            # ✅ ถ้าโพสต์ต้นฉบับถูกแชร์มาจากโพสต์อื่น ให้ใช้ `shared_from` ต้นฉบับ
            shared_from = post.shared_from if post.shared_from else post

            shared_post = Post.objects.create(
                author=request.user,
                content=shared_from.content,
                image=shared_from.image,
                shared_from=shared_from  # ✅ เก็บ `shared_from` ที่ถูกต้อง
            )
            return Response({'status': 'success', 'message': 'Post shared successfully'}, status=status.HTTP_201_CREATED)
        except Post.DoesNotExist:
            return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)


    

class FollowUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):  # เปลี่ยนจาก userId เป็น user_id
        try:
            followed_user = User.objects.get(id=user_id)
            if request.user == followed_user:
                return Response({'error': 'You cannot follow yourself.'}, status=status.HTTP_400_BAD_REQUEST)
            
            follow, created = Follow.objects.get_or_create(
                follower=request.user,
                followed=followed_user
            )
            if not created:
                return Response({'error': 'You are already following this user.'}, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({'status': 'success', 'message': 'You are now following this user.'}, status=status.HTTP_201_CREATED)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)


class UnfollowUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):  # เปลี่ยนจาก userId เป็น user_id
        try:
            followed_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        follow = Follow.objects.filter(follower=request.user, followed=followed_user)

        if follow.exists():
            follow.delete()
            return Response({'status': 'success', 'message': 'You have unfollowed this user.'}, status=status.HTTP_200_OK)
        return Response({'error': 'You are not following this user.'}, status=status.HTTP_400_BAD_REQUEST)

        

class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # ดึงข้อมูลผู้ใช้ทั้งหมด ยกเว้นผู้ใช้ที่ล็อกอินอยู่
        return User.objects.exclude(id=self.request.user.id)

    def get_serializer_context(self):
        # ส่ง request ไปยัง Serializer
        return {'request': self.request}

class FollowingPostsView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # ดึงโพสต์จากผู้ใช้ที่ติดตามและผู้ใช้เอง
        following_users = Follow.objects.filter(follower=self.request.user).values_list('followed', flat=True)
        following_users = list(following_users) + [self.request.user.id]  # เพิ่มผู้ใช้เอง
        return Post.objects.filter(author__in=following_users).order_by('-created_at')  

class UserPostsView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_id = self.kwargs['user_id']
        return Post.objects.filter(
            Q(author_id=user_id) |  # ✅ โพสต์ที่ user สร้างเอง
            Q(shared_from__isnull=False, author_id=user_id)  # ✅ โพสต์ที่ user แชร์เอง
        ).order_by('-created_at')

class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):  
        print("Requested user_id:", user_id)  # ✅ Debug ว่า user_id ถูกส่งมาถูกต้องหรือไม่
        user = get_object_or_404(User, id=user_id)  # ✅ ใช้ get_object_or_404 ป้องกัน DoesNotExist
        serializer = UserSerializer(user, context={'request': request})

        # ✅ ดึงข้อมูลผู้ติดตาม, ผู้ที่กำลังติดตาม, และจำนวนโพสต์
        followers_count = Follow.objects.filter(followed=user).count()
        following_count = Follow.objects.filter(follower=user).count()
        posts_count = Post.objects.filter(author=user).count()

        # ✅ เช็คว่าผู้ใช้ที่ล็อกอินอยู่กำลังติดตาม user_id นี้หรือไม่
        is_following = Follow.objects.filter(follower=request.user, followed=user).exists()

        response_data = serializer.data
        response_data.update({
            'followers_count': followers_count,
            'following_count': following_count,
            'posts_count': posts_count,
            'is_following': is_following  # ✅ เพิ่ม `is_following`
        })

        return Response(response_data, status=status.HTTP_200_OK)



        
class UserFollowersView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            followers = Follow.objects.filter(followed=user).values_list('follower', flat=True)
            followers_list = User.objects.filter(id__in=followers)
            serializer = UserSerializer(followers_list, many=True, context={'request': request})
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

class UserFollowingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            following = Follow.objects.filter(follower=user).values_list('followed', flat=True)
            following_list = User.objects.filter(id__in=following)
            serializer = UserSerializer(following_list, many=True, context={'request': request})
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
class AdminDeletePostView(DestroyAPIView):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [IsAdminUser]  # ✅ ให้เฉพาะ Admin ลบโพสต์ได้
    lookup_field = "id"

class AdminDeleteUserView(DestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]  # ✅ ให้เฉพาะ Admin ลบผู้ใช้ได้
    lookup_field = "id"
