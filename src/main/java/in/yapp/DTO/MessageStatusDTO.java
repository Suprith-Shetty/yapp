package in.yapp.DTO;

import in.yapp.Entity.MessageStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.UUID;

@Getter
@AllArgsConstructor
public class MessageStatusDTO {

    private UUID messageId;
    private UUID conversationId;
    private MessageStatus status;
}