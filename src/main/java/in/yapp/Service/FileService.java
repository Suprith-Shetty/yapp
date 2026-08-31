package in.yapp.Service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import in.yapp.Entity.Message;
import in.yapp.Repository.ConversationMemberRepository;
import in.yapp.Repository.MessageRespository;
import org.springframework.security.access.AccessDeniedException;

import java.security.Principal;
import java.util.UUID;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class FileService {

    private final Cloudinary cloudinary;
    private final MessageRespository messageRespository;
    private final ConversationMemberRepository conversationMemberRepository;

    private static final long IMAGE_MAX_SIZE = 10L * 1024 * 1024;
    private static final long VIDEO_MAX_SIZE = 100L * 1024 * 1024;
    private static final long OTHER_MAX_SIZE = 10L * 1024 * 1024;

    private static final Set<String> IMAGE_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
    );

    private static final Set<String> VIDEO_TYPES = Set.of(
            "video/mp4",
            "video/webm",
            "video/quicktime"
    );

    public Map<String, Object> uploadFile(MultipartFile file) throws IOException {

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty");
        }

        String contentType = file.getContentType();

        if (contentType == null) {
            throw new IllegalArgumentException(
                    "File type could not be determined"
            );
        }

        long size = file.getSize();

        if (IMAGE_TYPES.contains(contentType)) {

            if (size > IMAGE_MAX_SIZE) {
                throw new IllegalArgumentException(
                        "Image size cannot exceed 10 MB"
                );
            }

        } else if (VIDEO_TYPES.contains(contentType)) {

            if (size > VIDEO_MAX_SIZE) {
                throw new IllegalArgumentException(
                        "Video size cannot exceed 100 MB"
                );
            }

        } else {

            if (size > OTHER_MAX_SIZE) {
                throw new IllegalArgumentException(
                        "File size cannot exceed 10 MB"
                );
            }
        }

    String resourceType;

    if (contentType.equals("application/pdf")) {
        resourceType = "image";
    } else if (contentType.startsWith("audio/")) {
        resourceType = "video";
    } else if (contentType.startsWith("video/")) {
        resourceType = "video";
    } else if (contentType.startsWith("image/")) {
        resourceType = "image";
    } else {
        resourceType = "raw";
    }

        Map<String, Object> result =
                cloudinary.uploader().upload(
                        file.getBytes(),
                        ObjectUtils.asMap(
                                "resource_type", resourceType,
                                "folder", "yapp/files"
                        )
                );

        return result;
    }

    public String getFileUrl(
            UUID messageId,
            Principal principal) {

        UUID userId = UUID.fromString(principal.getName());

        Message message = messageRespository
                .findById(messageId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Message not found")
                );

        boolean isMember =
                conversationMemberRepository
                        .existsByConversationIdAndUserId(
                                message.getConversation().getId(),
                                userId
                        );

        if (!isMember) {
            throw new AccessDeniedException(
                    "You are not a member of this conversation"
            );
        }

        if (message.getFileUrl() == null) {
            throw new IllegalArgumentException(
                    "This message does not contain a file"
            );
        }

        return message.getFileUrl();
    }
}