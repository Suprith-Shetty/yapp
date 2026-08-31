package in.yapp.DTO;

import lombok.Data;

import java.util.UUID;

@Data
public class TypingMessageDTO {

    private UUID conversationId;
    private boolean typing;
}