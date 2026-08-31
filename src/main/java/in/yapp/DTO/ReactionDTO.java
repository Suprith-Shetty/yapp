package in.yapp.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.UUID;

@Getter
@AllArgsConstructor
public class ReactionDTO {

    private UUID reactionId;
    private UUID messageId;
    private UUID userId;
    private String username;
    private String emoji;
}