package in.yapp.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.UUID;

@Getter
@AllArgsConstructor
public class ReactionEventDTO {

    private String action; // "ADD" or "REMOVE"

    private UUID messageId;

    private UUID conversationId;

    private UUID reactionId;

    private UUID userId;

    private String username;

    private String emoji;
}