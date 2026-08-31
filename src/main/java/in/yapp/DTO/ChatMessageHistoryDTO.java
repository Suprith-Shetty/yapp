package in.yapp.DTO;

import in.yapp.Entity.MessageStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@AllArgsConstructor
public class ChatMessageHistoryDTO {

    private UUID conversationId;
    private UUID messageId;
    private String senderUserName;
    private String content;
    private Instant createdAt;
    private MessageStatus status;
    private String messageType;
    private String fileName;
    private String fileUrl;
    private String fileType;
    private Long fileSize;
    private UUID replyToMessageId;
    private String replyToContent;
    private String replyToSenderUserName;
    private String replyToMessageType;
    private String replyToFileName;
}