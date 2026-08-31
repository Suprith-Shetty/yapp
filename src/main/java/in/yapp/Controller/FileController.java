package in.yapp.Controller;

import in.yapp.DTO.ChatMessageResult;
import in.yapp.Service.ChatService;
import in.yapp.Service.FileService;
import in.yapp.Service.UploadRateLimiter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;


import java.security.Principal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/files")
public class FileController {

    private final FileService fileService;
    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UploadRateLimiter uploadRateLimiter;

    @PostMapping("/upload")
    public ResponseEntity<ChatMessageResult> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("conversationId") UUID conversationId,
            @RequestParam(value = "caption", required = false) String caption,
            Principal principal) throws Exception {


        UUID userId = UUID.fromString(principal.getName());

        if (!uploadRateLimiter.allowUpload(userId)) {
            return ResponseEntity
                    .status(429)
                    .build();
        }

        boolean isMember =
                chatService.isConversationMember(
                        conversationId,
                        principal
                );

        if (!isMember) {
            throw new AccessDeniedException(
                    "You are not a member of this conversation"
            );
        }

        Map<String, Object> uploadResult =
                fileService.uploadFile(file);

        String fileUrl =
                (String) uploadResult.get("secure_url");

        String fileName =
                file.getOriginalFilename();

        String fileType =
                file.getContentType();

        Long fileSize =
                file.getSize();

        ChatMessageResult result =
                chatService.saveFileMessage(
                        conversationId,
                        fileName,
                        fileUrl,
                        fileType,
                        fileSize,
                        caption,
                        principal
                );

        messagingTemplate.convertAndSendToUser(
                result.getRecipientUserId().toString(),
                "/queue/messages",
                result.getMessage()
        );

        return ResponseEntity.ok(result);
    }


    @GetMapping("/{messageId}")
    public ResponseEntity<?> getFile(
            @PathVariable UUID messageId,
            Principal principal) {

        String fileUrl =
                fileService.getFileUrl(
                        messageId,
                        principal
                );

        return ResponseEntity.ok(fileUrl);
    }
}