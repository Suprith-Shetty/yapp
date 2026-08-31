package in.yapp.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.UUID;

@Getter
@AllArgsConstructor
public class TypingMessageResult {

    private UUID conversationId;
    private String username;
    private boolean typing;
}