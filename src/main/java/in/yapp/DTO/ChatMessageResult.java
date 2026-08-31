package in.yapp.DTO;

import in.yapp.Entity.MessageStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@AllArgsConstructor
public class ChatMessageResult {

    private UUID messageId;
    private ChatMessageDTO message;
    private UUID recipientUserId;
    private MessageStatus status;
    private Instant createdAt;
}