package in.yapp.Controller;

import in.yapp.DTO.ReactionDTO;
import in.yapp.DTO.ReactionRequestDTO;
import in.yapp.Service.MessageReactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/reactions")
public class MessageReactionController {

    private final MessageReactionService reactionService;

    @PostMapping("/message/{messageId}")
    public ReactionDTO react(
            @PathVariable UUID messageId,
            @RequestBody ReactionRequestDTO request,
            Principal principal
    ) {
        return reactionService.react(
                messageId,
                request,
                principal
        );
    }

    @DeleteMapping("/message/{messageId}")
    public void removeReaction(
            @PathVariable UUID messageId,
            @RequestParam String emoji,
            Principal principal
    ) {
        reactionService.removeReaction(
                messageId,
                emoji,
                principal
        );
    }

    @GetMapping("/conversation/{conversationId}")
    public List<ReactionDTO> getConversationReactions(
            @PathVariable UUID conversationId,
            Principal principal
    ) {
        return reactionService.getConversationReactions(
                conversationId,
                principal
        );
    }
}