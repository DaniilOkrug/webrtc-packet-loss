const App = () => {
  return (
    <div>
      <video
        style={{
          width: 240,
          height: 240,
          margin: 5,
          backgroundColor: "black",
        }}
        controls
      >
        <source
          src={`http://localhost:3001/video`}
          onPlaying={console.log}
          type="video/mp4"
        />
      </video>
    </div>
  );
};

export default App;
