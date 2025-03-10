from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
import os
from django.utils.timezone import now

def profile_picture_upload(instance, filename):
    ext = filename.split('.')[-1]  # ดึงนามสกุลไฟล์ เช่น jpg, png
    filename = f"{instance.username}_{now().strftime('%Y%m%d%H%M%S')}.{ext}"  # ตั้งชื่อไฟล์ใหม่
    return os.path.join('profile_pictures/', filename)

class CustomUser(AbstractUser):
    first_name = models.CharField(_('first name'), max_length=150)
    last_name = models.CharField(_('last name'), max_length=150)
    profile_picture = models.ImageField(upload_to=profile_picture_upload, blank=True, null=True)  # ✅ ใช้ฟังก์ชันเปลี่ยนชื่อไฟล์

    def __str__(self):
        return self.username

User = get_user_model()

class Post(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    content = models.TextField()
    image = models.ImageField(upload_to='post_images/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    likes = models.ManyToManyField(User, related_name='liked_posts', blank=True)
    shares = models.ManyToManyField(User, related_name='shared_posts', blank=True)
    shared_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='shared_posts')

    def __str__(self):
        return f'Post by {self.author.username}'

class Follow(models.Model):
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following')
    followed = models.ForeignKey(User, on_delete=models.CASCADE, related_name='followers')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('follower', 'followed')  # ป้องกันการติดตามซ้ำ

    def __str__(self):
        return f'{self.follower.username} follows {self.followed.username}'