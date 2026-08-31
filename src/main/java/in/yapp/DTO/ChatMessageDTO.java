package in.yapp.DTO;

import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
public class ChatMessageDTO {

    private UUID messageId;

    private String content;

    private String senderUserName;

    private UUID senderUserId;

    private UUID conversationId;

    private String messageType;

    private String fileName;

    private String fileUrl;

    private String fileType;

    private Long fileSize;

    private Instant createdAt;

    private UUID replyToMessageId;

    private String replyToContent;



    private String replyToSenderUserName;

    private String replyToMessageType;

    private String replyToFileName;

}