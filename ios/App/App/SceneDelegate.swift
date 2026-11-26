import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = GameViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

final class GameViewController: UIViewController {
    private let game = CAPBridgeViewController()

    override func viewDidLoad() {
        super.viewDidLoad()
        addChild(game)

        // Embed the Capacitor controller without replacing the view it manages.
        let gameView = game.view!
        view.backgroundColor = gameView.backgroundColor
        gameView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(gameView)

        let safeArea = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            gameView.topAnchor.constraint(equalTo: safeArea.topAnchor),
            gameView.leadingAnchor.constraint(equalTo: safeArea.leadingAnchor),
            gameView.trailingAnchor.constraint(equalTo: safeArea.trailingAnchor),
            gameView.bottomAnchor.constraint(equalTo: safeArea.bottomAnchor),
        ])
        game.didMove(toParent: self)
    }

    override var childForStatusBarStyle: UIViewController? { game }
    override var childForStatusBarHidden: UIViewController? { game }
}
